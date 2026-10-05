'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/frontend/lib/auth-context'
import { supabase } from '@/frontend/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const { login, loginWithGoogle, isAuthenticated, isLoading, error, clearError } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [googleError, setGoogleError] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (isAuthenticated) router.replace('/')
  }, [isAuthenticated, router])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    clearError()
    setLocalError(null)
    if (!email.trim()) { setLocalError('Please enter your email'); return }
    if (!password) { setLocalError('Please enter your password'); return }
    setSubmitting(true)
    try {
      await login({ email: email.trim().toLowerCase(), password })
      router.replace('/')
    } catch {
      // error is shown via context
    } finally {
      setSubmitting(false)
    }
  }

  async function signInWithGoogle() {
    setGoogleError(null)
    clearError()
    setGoogleLoading(true)
    try {
      await loginWithGoogle()
      router.replace('/')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed'
      if (msg.includes('popup-closed-by-user')) {
        setGoogleLoading(false)
        return
      }
      setGoogleError(msg)
    } finally {
      setGoogleLoading(false)
    }
  }

  const displayError = localError || error || googleError

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <Zap className="size-6" fill="currentColor" />
          </div>
          <span className="auth-logo-text">CloudPay</span>
        </div>

        {/* Header */}
        <div className="auth-header">
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">Sign in to your CloudPay account</p>
        </div>

        {/* Google Sign In */}
        <button
          type="button"
          disabled={googleLoading || submitting}
          onClick={signInWithGoogle}
          className="google-btn"
        >
          {googleLoading ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <GoogleIcon />
          )}
          <span>Continue with Google</span>
        </button>

        <div className="auth-divider">
          <span className="auth-divider-line" />
          <span className="auth-divider-text">or sign in with email</span>
          <span className="auth-divider-line" />
        </div>

        {/* Error Alert */}
        {displayError && (
          <div className="auth-error" role="alert">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{displayError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={submit} className="auth-form">
          <div className="form-field">
            <label className="form-label" htmlFor="login-email">Email address</label>
            <div className="form-input-wrap">
              <Mail className="form-icon" />
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => { setEmail(e.target.value); setLocalError(null) }}
                className="form-input"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div className="form-field">
            <div className="form-label-row">
              <label className="form-label" htmlFor="login-password">Password</label>
              <a href="#" className="form-forgot">Forgot password?</a>
            </div>
            <div className="form-input-wrap">
              <Lock className="form-icon" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                minLength={8}
                value={password}
                onChange={e => { setPassword(e.target.value); setLocalError(null) }}
                className="form-input form-input-password"
                placeholder="••••••••"
              />
              <button
                type="button"
                className="form-eye-btn"
                onClick={() => setShowPassword(v => !v)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={submitting || isLoading}
            className="auth-submit-btn"
          >
            {submitting ? <Loader2 className="size-5 animate-spin" /> : 'Sign in'}
          </Button>
        </form>

        <p className="auth-footer">
          New to CloudPay?{' '}
          <Link href="/register" className="auth-link">Create an account</Link>
        </p>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}
