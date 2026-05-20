import { ipcMain, shell } from 'electron'
import { supabase, fetchUserProfile, broadcastAuthChange } from '../supabase'

export function registerAuthHandlers(): void {
  ipcMain.handle('auth:signUp', async (_e, email, password, name) => {
    if (!supabase) {
      return { success: false, error: 'Supabase client not configured. Add credentials to your .env file.' }
    }
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name }
        }
      })
      if (error) return { success: false, error: error.message }
      
      let profile = null
      if (data.user) {
        profile = await fetchUserProfile(data.user.id)
      }
      broadcastAuthChange(data.session, profile)
      return { success: true, user: data.user, profile }
    } catch (err: any) {
      return { success: false, error: err.message || 'An error occurred during signup.' }
    }
  })

  ipcMain.handle('auth:signIn', async (_e, email, password) => {
    if (!supabase) {
      return { success: false, error: 'Supabase client not configured. Add credentials to your .env file.' }
    }
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return { success: false, error: error.message }
      
      let profile = null
      if (data.user) {
        profile = await fetchUserProfile(data.user.id)
      }
      broadcastAuthChange(data.session, profile)
      return { success: true, user: data.user, profile }
    } catch (err: any) {
      return { success: false, error: err.message || 'An error occurred during sign in.' }
    }
  })

  ipcMain.handle('auth:signInWithGoogle', async () => {
    if (!supabase) {
      return { success: false, error: 'Supabase client not configured. Add credentials to your .env file.' }
    }
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'frescava://auth-callback'
        }
      })
      if (error) return { success: false, error: error.message }
      if (data.url) {
        await shell.openExternal(data.url)
        return { success: true }
      }
      return { success: false, error: 'Failed to generate Google auth redirection URL.' }
    } catch (err: any) {
      return { success: false, error: err.message || 'An error occurred launching Google auth.' }
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
      return { success: false, error: err.message || 'An error occurred during sign out.' }
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
      console.error('[Supabase] getProfile handler error:', err)
      return { profile: null }
    }
  })

  ipcMain.handle('auth:updateProfile', async (_e, name) => {
    if (!supabase) {
      return { success: false, error: 'Supabase client not configured.' }
    }
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
      return { success: false, error: err.message || 'Failed to update profile.' }
    }
  })
}
