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

// ─────────────────────────────────────────────────────────────
//  Proper multi-key encrypted storage (needed for PKCE flow)
//  Stores a JSON map encrypted with safeStorage (Windows DPAPI)
// ─────────────────────────────────────────────────────────────
const storageFilePath = join(app.getPath('userData'), 'auth_store.dat')

function readStorageMap(): Record<string, string> {
  try {
    if (!fs.existsSync(storageFilePath)) return {}
    const encrypted = fs.readFileSync(storageFilePath)
    if (encrypted.length === 0) return {}
    const raw = safeStorage.isEncryptionAvailable()
      ? safeStorage.decryptString(encrypted)
      : encrypted.toString('utf8')
    return JSON.parse(raw) as Record<string, string>
  } catch {
    return {}
  }
}

function writeStorageMap(data: Record<string, string>): void {
  try {
    const json = JSON.stringify(data)
    const buffer = safeStorage.isEncryptionAvailable()
      ? safeStorage.encryptString(json)
      : Buffer.from(json, 'utf8')
    fs.writeFileSync(storageFilePath, buffer)
  } catch (e) {
    console.error('[secureStorage] Write failed:', e)
  }
}

const secureStorage = {
  getItem(key: string): string | null {
    return readStorageMap()[key] ?? null
  },
  setItem(key: string, value: string): void {
    const data = readStorageMap()
    data[key] = value
    writeStorageMap(data)
  },
  removeItem(key: string): void {
    const data = readStorageMap()
    delete data[key]
    writeStorageMap(data)
  }
}

// ─────────────────────────────────────────────────────────────
//  Supabase Client
// ─────────────────────────────────────────────────────────────
export let supabase: SupabaseClient | null = null

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: secureStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce'
    }
  })
} else {
  console.warn('[Supabase] Missing keys. Auth functions will fallback to guest mode.')
}

// ─────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────

/** Broadcast auth state changes to all active renderer windows */
export function broadcastAuthChange(session: any, profile: any): void {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) {
      w.webContents.send('auth:changed', { session, profile })
    }
  }
}

/** Fetch user profile row from public.profiles */
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

/** Exchange an OAuth authorization code (PKCE) for a full session */
export async function exchangeCodeForSession(code: string): Promise<void> {
  if (!supabase) return
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    console.error('[Supabase] exchangeCodeForSession error:', error)
    return
  }
  if (data.user) {
    const profile = await fetchUserProfile(data.user.id)
    broadcastAuthChange(data.session, profile)
  }
}
