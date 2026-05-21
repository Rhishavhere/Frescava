import { ipcMain, shell } from 'electron'
import { createServer, type Server } from 'http'
import { supabase, fetchUserProfile, broadcastAuthChange, exchangeCodeForSession } from '../supabase'

// Fixed local callback port — add http://localhost:7842/callback to Supabase redirect URLs
const OAUTH_PORT = 7842
const OAUTH_CALLBACK_PATH = '/callback'
const OAUTH_REDIRECT_URL = `http://localhost:${OAUTH_PORT}${OAUTH_CALLBACK_PATH}`

// Track active server to avoid duplicate listeners
let oauthServer: Server | null = null

/** Start a one-shot local HTTP server that intercepts the OAuth callback */
function startOAuthCallbackServer(): Promise<string> {
  return new Promise((resolve, reject) => {
    // Clean up any stale server from a previous attempt
    if (oauthServer) {
      oauthServer.close()
      oauthServer = null
    }

    const server = createServer((req, res) => {
      try {
        const url = new URL(req.url ?? '/', `http://localhost:${OAUTH_PORT}`)
        if (url.pathname !== OAUTH_CALLBACK_PATH) {
          res.writeHead(404)
          res.end()
          return
        }

        const code = url.searchParams.get('code')
        const error = url.searchParams.get('error')
        const errorDesc = url.searchParams.get('error_description') ?? 'Unknown error'

        // Always respond with a nice HTML page so the browser tab looks good
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })

        if (code) {
          res.end(successHtml())
          server.close(() => { oauthServer = null })
          resolve(code)
        } else {
          res.end(errorHtml(errorDesc))
          server.close(() => { oauthServer = null })
          reject(new Error(error ?? 'OAuth failed'))
        }
      } catch (e) {
        res.writeHead(500)
        res.end()
        reject(e)
      }
    })

    oauthServer = server

    server.on('error', (err: NodeJS.ErrnoException) => {
      oauthServer = null
      if (err.code === 'EADDRINUSE') {
        reject(new Error(`Port ${OAUTH_PORT} is in use. Please close any other Frescava instance and try again.`))
      } else {
        reject(err)
      }
    })

    server.listen(OAUTH_PORT, '127.0.0.1')

    // Auto-timeout after 5 minutes if the user abandons the browser
    setTimeout(() => {
      if (server.listening) {
        server.close(() => { oauthServer = null })
        reject(new Error('Google sign-in timed out. Please try again.'))
      }
    }, 5 * 60 * 1000)
  })
}

// ─────────────────────────────────────────────────────────────
//  IPC Handlers
// ─────────────────────────────────────────────────────────────
export function registerAuthHandlers(): void {

  ipcMain.handle('auth:signUp', async (_e, email, password, name) => {
    if (!supabase) return { success: false, error: 'Supabase not configured.' }
    try {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { name } }
      })
      if (error) return { success: false, error: error.message }
      let profile = null
      if (data.user) profile = await fetchUserProfile(data.user.id)
      broadcastAuthChange(data.session, profile)
      return { success: true, user: data.user, profile }
    } catch (err: any) {
      return { success: false, error: err.message ?? 'Signup error.' }
    }
  })

  ipcMain.handle('auth:signIn', async (_e, email, password) => {
    if (!supabase) return { success: false, error: 'Supabase not configured.' }
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return { success: false, error: error.message }
      let profile = null
      if (data.user) profile = await fetchUserProfile(data.user.id)
      broadcastAuthChange(data.session, profile)
      return { success: true, user: data.user, profile }
    } catch (err: any) {
      return { success: false, error: err.message ?? 'Sign-in error.' }
    }
  })

  ipcMain.handle('auth:signInWithGoogle', async () => {
    if (!supabase) return { success: false, error: 'Supabase not configured.' }
    try {
      // 1. Generate the OAuth URL with our local server as the redirect target
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: OAUTH_REDIRECT_URL,
          skipBrowserRedirect: true  // Don't auto-open; we open manually below
        }
      })

      if (error || !data.url) {
        return { success: false, error: error?.message ?? 'Failed to generate OAuth URL.' }
      }

      // 2. Start the local callback server BEFORE opening the browser
      const codePromise = startOAuthCallbackServer()

      // 3. Open the OAuth URL in the user's default browser
      await shell.openExternal(data.url)

      // 4. Wait for the code to arrive at our local server (non-blocking for renderer)
      codePromise.then(async (code) => {
        await exchangeCodeForSession(code)
      }).catch((err) => {
        console.error('[OAuth] Callback server error:', err)
      })

      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message ?? 'Google sign-in error.' }
    }
  })

  ipcMain.handle('auth:signOut', async () => {
    if (!supabase) return { success: true }
    try {
      const { error } = await supabase.auth.signOut()
      if (error) return { success: false, error: error.message }
      broadcastAuthChange(null, null)
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message ?? 'Sign-out error.' }
    }
  })

  ipcMain.handle('auth:getProfile', async () => {
    if (!supabase) return { profile: null }
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { profile: null }
      const profile = await fetchUserProfile(user.id)
      return { profile }
    } catch (err) {
      console.error('[Supabase] getProfile error:', err)
      return { profile: null }
    }
  })

  ipcMain.handle('auth:updateProfile', async (_e, name) => {
    if (!supabase) return { success: false, error: 'Supabase not configured.' }
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { success: false, error: 'Not authenticated.' }
      const { data, error } = await supabase
        .from('profiles')
        .update({ name })
        .eq('id', user.id)
        .select()
        .single()
      if (error) return { success: false, error: error.message }
      const { data: { session } } = await supabase.auth.getSession()
      broadcastAuthChange(session, data)
      return { success: true, profile: data }
    } catch (err: any) {
      return { success: false, error: err.message ?? 'Update failed.' }
    }
  })
}

// ─────────────────────────────────────────────────────────────
//  HTML pages shown in the browser after OAuth
// ─────────────────────────────────────────────────────────────
function successHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Signed in to Frescava</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0c0c0e;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .card {
      text-align: center;
      padding: 48px 40px;
      max-width: 380px;
    }
    .icon {
      width: 56px;
      height: 56px;
      background: #1a1a1f;
      border: 1px solid #2a2a32;
      border-radius: 16px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      margin-bottom: 24px;
    }
    h1 { font-size: 22px; font-weight: 700; margin-bottom: 10px; letter-spacing: -0.3px; }
    p { font-size: 14px; color: rgba(255,255,255,0.45); line-height: 1.6; }
    .badge {
      display: inline-block;
      margin-top: 28px;
      padding: 8px 18px;
      background: #E8D8C4;
      color: #0c0c0e;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.05em;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✦</div>
    <h1>You're signed in</h1>
    <p>Return to Frescava. You can safely close this tab.</p>
    <div class="badge">FRESCAVA</div>
  </div>
</body>
</html>`
}

function errorHtml(message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Sign-in Failed</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0c0c0e;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .card { text-align: center; padding: 48px 40px; max-width: 380px; }
    .icon {
      width: 56px; height: 56px;
      background: #1a0a0a; border: 1px solid #3a1a1a; border-radius: 16px;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 24px; margin-bottom: 24px;
    }
    h1 { font-size: 22px; font-weight: 700; margin-bottom: 10px; }
    p { font-size: 13px; color: rgba(255,255,255,0.4); }
    .err { color: #ff6b6b; font-size: 12px; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✕</div>
    <h1>Sign-in Failed</h1>
    <p>Something went wrong. Return to Frescava and try again.</p>
    <p class="err">${message}</p>
  </div>
</body>
</html>`
}
