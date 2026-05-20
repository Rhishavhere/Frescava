import { useState } from 'react'
import { useAuthStore } from '../../store/authStore'

export default function AuthModal() {
  const {
    showAuthModal,
    setShowAuthModal,
    login,
    signUp,
    signInWithGoogle,
    isLoading,
    error,
    clearError
  } = useAuthStore()

  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')

  if (!showAuthModal) return null

  const handleClose = () => {
    setEmail('')
    setPassword('')
    setName('')
    clearError()
    setShowAuthModal(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSignUp) {
      const res = await signUp(email, password, name)
      if (res.success) handleClose()
    } else {
      const res = await login(email, password)
      if (res.success) handleClose()
    }
  }

  const handleGoogleLogin = async () => {
    const res = await signInWithGoogle()
    if (res.success) {
      // Handled by browser, modal closes when auth completes via deep link broadcast
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md transition-opacity duration-300">
      <div className="relative w-full max-w-[420px] bg-[#121215]/95 border border-zinc-800/80 rounded-[32px] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
        {/* Decorative subtle ambient lights */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleClose}
          type="button"
          className="absolute top-6 right-6 p-1 rounded-full text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Modal Header */}
        <div className="flex flex-col items-center mb-6">
          <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-2">Frescava Cloud</span>
          <h2 className="text-2xl font-serif font-bold text-zinc-100 tracking-wide text-center">
            {isSignUp ? 'Create Creator Account' : 'Welcome to Frescava'}
          </h2>
          <p className="text-[11px] text-zinc-400 mt-1 text-center font-serif italic">
            Unlock professional grading presets and beta tool access
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-4 p-3 bg-red-950/40 border border-red-900/50 rounded-xl text-red-200 text-xs leading-normal">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {isSignUp && (
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest pl-1">Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Guest Creator"
                className="w-full bg-[#18181C] border border-zinc-800 focus:border-zinc-700 rounded-xl px-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
              />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest pl-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="creator@frescava.com"
              className="w-full bg-[#18181C] border border-zinc-800 focus:border-zinc-700 rounded-xl px-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest pl-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#18181C] border border-zinc-800 focus:border-zinc-700 rounded-xl px-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 bg-[#E8D8C4] hover:bg-[#F2E5D5] active:scale-[0.98] disabled:opacity-40 disabled:hover:bg-[#E8D8C4] text-zinc-950 rounded-[16px] text-xs font-bold uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                Connecting...
              </>
            ) : (
              isSignUp ? 'Create Account' : 'Sign In'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center my-5">
          <div className="flex-1 h-px bg-zinc-800/80" />
          <span className="px-3 text-[9px] font-mono text-zinc-600 uppercase tracking-widest">or</span>
          <div className="flex-1 h-px bg-zinc-800/80" />
        </div>

        {/* Third-Party Authentication Options */}
        <button
          onClick={handleGoogleLogin}
          type="button"
          disabled={isLoading}
          className="w-full py-2.5 bg-[#18181C] hover:bg-[#202026] active:scale-[0.98] border border-zinc-800 rounded-[16px] text-xs text-zinc-200 font-semibold transition-all flex items-center justify-center gap-2.5"
        >
          {/* Flat Google Logo Icon */}
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        {/* Footer Toggle links */}
        <div className="mt-6 flex justify-center text-[11px] text-zinc-500">
          <span>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            <button
              onClick={() => {
                clearError()
                setIsSignUp(!isSignUp)
              }}
              type="button"
              className="ml-1 text-[#E8D8C4] hover:underline focus:outline-none"
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </span>
        </div>
      </div>
    </div>
  )
}
