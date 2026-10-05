'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail, Phone, User, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/frontend/lib/auth-context'
import { supabase } from '@/frontend/lib/supabase'

export default function RegisterPage() {
  const router = useRouter()
  const { register, loginWithGoogle, isLoading, error, notice, clearError } = useAuth()
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [googleError, setGoogleError] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)

  function update(field: keyof typeof form, value: string) {
    setForm(cur => ({ ...cur, [field]: value }))
    setLocalError(null)
    clearError()
  }

  function validate() {
    if (!form.fullName.trim()) return 'Full name is required'
    if (!form.email.trim()) return 'Email is required'
    if (!form.email.includes('@')) return 'Please enter a valid email'
    if (!form.phone.trim()) return 'Phone number is required'
    if (form.password.length < 8) return 'Password must be at least 8 characters'
    return null
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const err = validate()
    if (err) { setLocalError(err); return }
    clearError()
    setLocalError(null)
    setSubmitting(true)
    try {
      const success = await register({
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
      })
      if (success) router.replace('/')
    } catch {
      // error shown via context
    } finally {
      setSubmitting(false)
    }
  }

  async function signUpWithGoogle() {
    setGoogleError(null)
    clearError()
    setGoogleLoading(true)
    try {
      await loginWithGoogle()
      router.replace('/')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-up failed'
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
          <h1 className="auth-title">Create your account</h1>
          <p className="auth-subtitle">Join CloudPay for secure UPI payments</p>
        </div>

        {/* Google Sign Up */}
        <button
          type="button"
          disabled={googleLoading || submitting}
          onClick={signUpWithGoogle}
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
          <span className="auth-divider-text">or create with email</span>
          <span className="auth-divider-line" />
        </div>

        {/* Error / Notice */}
        {displayError && (
          <div className="auth-error" role="alert">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{displayError}</span>
          </div>
        )}
        {notice && !displayError && (
          <div className="auth-notice" role="status">
            <span>✓</span>
            <span>{notice}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={submit} className="auth-form">
          <div className="form-field">
            <label className="form-label" htmlFor="reg-name">Full name</label>
            <div className="form-input-wrap">
              <User className="form-icon" />
              <input
                id="reg-name"
                type="text"
                autoComplete="name"
                required
                maxLength={150}
                value={form.fullName}
                onChange={e => update('fullName', e.target.value)}
                className="form-input"
                placeholder="Rahul Sharma"
              />
            </div>
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="reg-email">Email address</label>
            <div className="form-input-wrap">
              <Mail className="form-icon" />
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={e => update('email', e.target.value)}
                className="form-input"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="reg-phone">Phone number</label>
            <div className="form-input-wrap">
              <Phone className="form-icon" />
              <input
                id="reg-phone"
                type="tel"
                autoComplete="tel"
                required
                value={form.phone}
                onChange={e => update('phone', e.target.value)}
                className="form-input"
                placeholder="+91 98765 43210"
              />
            </div>
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="reg-password">Password</label>
            <div className="form-input-wrap">
              <Lock className="form-icon" />
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                minLength={8}
                value={form.password}
                onChange={e => update('password', e.target.value)}
                className="form-input form-input-password"
                placeholder="Min. 8 characters"
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
            {submitting ? <Loader2 className="size-5 animate-spin" /> : 'Create account'}
          </Button>
        </form>

        <p className="auth-footer">
          Already have an account?{' '}
          <Link href="/login" className="auth-link">Sign in</Link>
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
