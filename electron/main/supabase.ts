import { app, safeStorage, BrowserWindow } from 'electron'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import { join } from 'path'

// Helper to manually load .env file in root directory as fallback
function loadEnv(): void {
  try {
    const envPath = join(app.getAppPath(), '.env')
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8')
      for (const line of content.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const index = trimmed.indexOf('=')
        if (index > 0) {
          const key = trimmed.slice(0, index).trim()
          let val = trimmed.slice(index + 1).trim()
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1)
          }
          if (!process.env[key]) {
            process.env[key] = val
          }
        }
      }
    }
  } catch (err) {
    console.error('Failed to parse local .env file:', err)
  }
}

loadEnv()

// Get keys from environmental variables
const supabaseUrl = process.env['MAIN_VITE_SUPABASE_URL'] || process.env['SUPABASE_URL'] || ''
const supabaseAnonKey = process.env['MAIN_VITE_SUPABASE_ANON_KEY'] || process.env['SUPABASE_ANON_KEY'] || ''

const sessionFilePath = join(app.getPath('userData'), 'auth_session.dat')

// Custom storage provider using Electron safeStorage DPAPI encryption
const secureStorage = {
  getItem(key: string): string | null {
    try {
      if (!fs.existsSync(sessionFilePath)) return null
      const encrypted = fs.readFileSync(sessionFilePath)
      if (encrypted.length === 0) return null
      if (safeStorage.isEncryptionAvailable()) {
        return safeStorage.decryptString(encrypted)
      }
      return encrypted.toString('utf8')
    } catch (e) {
      console.error('[secureStorage] Failed to decrypt session:', e)
      return null
    }
  },
  setItem(key: string, value: string): void {
    try {
      let buffer: Buffer
      if (safeStorage.isEncryptionAvailable()) {
        buffer = safeStorage.encryptString(value)
      } else {
        buffer = Buffer.from(value, 'utf8')
      }
      fs.writeFileSync(sessionFilePath, buffer)
    } catch (e) {
      console.error('[secureStorage] Failed to encrypt session:', e)
    }
  },
  removeItem(key: string): void {
    try {
      if (fs.existsSync(sessionFilePath)) {
        fs.unlinkSync(sessionFilePath)
      }
    } catch (e) {
      console.error('[secureStorage] Failed to remove session file:', e)
    }
  }
}

// Initialize Supabase Client
export let supabase: SupabaseClient | null = null

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: secureStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false
    }
  })
} else {
  console.warn('[Supabase] Missing keys. Auth functions will fallback to stub guest mode.')
}

// Helper to broadcast auth changes to all active windows
export function broadcastAuthChange(session: any, profile: any): void {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) {
      w.webContents.send('auth:changed', { session, profile })
    }
  }
}

// Fetch user profile from Postgres public.profiles
export async function fetchUserProfile(userId: string): Promise<any> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('[Supabase] Error fetching profile:', error)
    return null
  }
  return data
}

// Establish session from parsed deep-link tokens
export async function establishSupabaseSession(accessToken: string, refreshToken: string): Promise<void> {
  if (!supabase) return
  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken
  })

  if (error) {
    console.error('[Supabase] setSession error:', error)
    return
  }

  if (data.user) {
    const profile = await fetchUserProfile(data.user.id)
    broadcastAuthChange(data.session, profile)
  }
}
