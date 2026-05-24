import { create } from 'zustand'

export type UserRole = 'free' | 'pro' | 'beta_tester' | 'admin'

export interface UserProfile {
  id: string
  name: string
  role: UserRole
  created_at: string
  updated_at: string
}

function isUserRole(value: unknown): value is UserRole {
  return value === 'free' || value === 'pro' || value === 'beta_tester' || value === 'admin'
}

function profileFromAuthUser(user: any): UserProfile | null {
  if (!user?.id) return null
  const metadata = user.user_metadata ?? {}
  const appMetadata = user.app_metadata ?? {}
  const now = new Date().toISOString()
  const name =
    metadata.name ??
    metadata.full_name ??
    metadata.display_name ??
    (typeof user.email === 'string' ? user.email.split('@')[0] : null) ??
    'Creator'

  return {
    id: user.id,
    name,
    role: isUserRole(appMetadata.role) ? appMetadata.role : 'free',
    created_at: user.created_at ?? now,
    updated_at: user.updated_at ?? user.created_at ?? now,
  }
}

function resolveProfile(profile: UserProfile | null | undefined, user: any): UserProfile | null {
  return profile ?? profileFromAuthUser(user)
}

interface AuthStore {
  profile: UserProfile | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  showAuthModal: boolean
  
  setShowAuthModal: (show: boolean) => void
  checkSession: () => Promise<void>
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signUp: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<{ success: boolean; error?: string }>
  clearError: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  profile: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  showAuthModal: false,

  setShowAuthModal: (show) => set({ showAuthModal: show }),

  clearError: () => set({ error: null }),

  checkSession: async () => {
    set({ isLoading: true, error: null })
    try {
      const { profile, user, error } = await window.frame.auth.getProfile()
      const resolvedProfile = resolveProfile(profile, user)
      if (error) {
        set({ error, profile: null, isAuthenticated: false, isLoading: false })
      } else if (user) {
        set({ profile: resolvedProfile, isAuthenticated: true, isLoading: false })
      } else {
        set({ profile: null, isAuthenticated: false, isLoading: false })
      }
    } catch (err: any) {
      set({
        error: err.message || 'Failed to sync authentication session.',
        profile: null,
        isAuthenticated: false,
        isLoading: false
      })
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const res = await window.frame.auth.signIn(email, password)
      if (res.success) {
        set({ profile: resolveProfile(res.profile, res.user), isAuthenticated: true, isLoading: false })
        return { success: true }
      } else {
        set({ error: res.error || 'Login failed.', isLoading: false })
        return { success: false, error: res.error }
      }
    } catch (err: any) {
      const errMsg = err.message || 'An error occurred during sign in.'
      set({ error: errMsg, isLoading: false })
      return { success: false, error: errMsg }
    }
  },

  signUp: async (email, password, name) => {
    set({ isLoading: true, error: null })
    try {
      const res = await window.frame.auth.signUp(email, password, name)
      if (res.success) {
        set({ profile: resolveProfile(res.profile, res.user), isAuthenticated: true, isLoading: false })
        return { success: true }
      } else {
        set({ error: res.error || 'Signup failed.', isLoading: false })
        return { success: false, error: res.error }
      }
    } catch (err: any) {
      const errMsg = err.message || 'An error occurred during signup.'
      set({ error: errMsg, isLoading: false })
      return { success: false, error: errMsg }
    }
  },

  signInWithGoogle: async () => {
    set({ isLoading: true, error: null })
    try {
      const res = await window.frame.auth.signInWithGoogle()
      if (res.success) {
        // App launches default browser, we wait for deep-link auth callback
        set({ isLoading: false })
        return { success: true }
      } else {
        set({ error: res.error || 'OAuth launch failed.', isLoading: false })
        return { success: false, error: res.error }
      }
    } catch (err: any) {
      const errMsg = err.message || 'Failed to initiate Google OAuth login.'
      set({ error: errMsg, isLoading: false })
      return { success: false, error: errMsg }
    }
  },

  logout: async () => {
    set({ isLoading: true, error: null })
    try {
      const res = await window.frame.auth.signOut()
      if (res.success) {
        set({ profile: null, isAuthenticated: false, isLoading: false })
        return { success: true }
      } else {
        set({ error: res.error || 'Logout failed.', isLoading: false })
        return { success: false, error: res.error }
      }
    } catch (err: any) {
      const errMsg = err.message || 'An error occurred during logout.'
      set({ error: errMsg, isLoading: false })
      return { success: false, error: errMsg }
    }
  }
}))

// Auto-subscribe to auth state changes broadcasted from Main Process
window.frame.auth.onAuthChange((payload) => {
  const user = payload?.session?.user ?? payload?.user
  const profile = resolveProfile(payload?.profile, user)
  if (user) {
    useAuthStore.setState({
      profile,
      isAuthenticated: true,
      isLoading: false,
      showAuthModal: false,  // ← close modal automatically on successful auth
      error: null
    })
  } else {
    useAuthStore.setState({
      profile: null,
      isAuthenticated: false,
      isLoading: false
    })
  }
})
