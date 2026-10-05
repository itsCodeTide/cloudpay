'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { User } from '@/frontend/types'
import type { LoginPayload, RegisterPayload } from '@/frontend/services/auth.service'
import { authService } from '@/frontend/services/auth.service'
import { getApiErrorMessage, sessionStorage } from '@/frontend/services/api-client'
import { userService } from '@/frontend/services/user.service'
import { supabase } from '@/frontend/lib/supabase'

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  notice: string | null
  updateUser: (user: User) => void
  login: (payload: LoginPayload) => Promise<void>
  loginWithGoogle: () => Promise<User>
  register: (payload: RegisterPayload) => Promise<boolean>
  logout: () => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const mountedRef = useRef(true)

  // Restore session on mount
  useEffect(() => {
    mountedRef.current = true
    let ignore = false

    async function restore() {
      try {
        // First try to load from local storage for instant display
        const savedUser = sessionStorage.getUser()
        if (savedUser && !ignore && mountedRef.current) {
          setUser(savedUser)
        }

        const token = sessionStorage.getAccessToken()
        const refreshToken = sessionStorage.getRefreshToken()

        if (!token && !refreshToken) {
          // No tokens — check Supabase session (for OAuth flows)
          const { data: { session } } = await supabase.auth.getSession()
          if (session && !ignore && mountedRef.current) {
            sessionStorage.saveTokens(session.access_token, session.refresh_token)
            try {
              const profile = await authService.sync()
              sessionStorage.save({ ...profile, accessToken: session.access_token, refreshToken: session.refresh_token })
              if (!ignore && mountedRef.current) setUser(profile.user)
            } catch {
              sessionStorage.clear()
            }
          }
          return
        }

        // Validate the stored token
        try {
          const currentUser = await userService.me()
          if (!ignore && mountedRef.current) {
            setUser(currentUser)
            sessionStorage.saveUser(currentUser)
          }
        } catch (err: unknown) {
          // Token may be expired — try to refresh via Supabase
          const storedRefresh = sessionStorage.getRefreshToken()
          if (storedRefresh) {
            try {
              const { data, error: refreshErr } = await supabase.auth.refreshSession({ refresh_token: storedRefresh })
              if (!refreshErr && data.session) {
                sessionStorage.saveTokens(data.session.access_token, data.session.refresh_token)
                const currentUser = await userService.me()
                if (!ignore && mountedRef.current) {
                  setUser(currentUser)
                  sessionStorage.saveUser(currentUser)
                }
                return
              }
            } catch {
              // refresh also failed
            }
          }
          // All refresh attempts failed — clear and redirect to login
          if (!ignore && mountedRef.current) {
            sessionStorage.clear()
            setUser(null)
          }
        }
      } finally {
        if (!ignore && mountedRef.current) setIsLoading(false)
      }
    }

    restore()

    // Listen to Supabase auth state changes (for OAuth)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (ignore) return
      if (event === 'SIGNED_IN' && session) {
        sessionStorage.saveTokens(session.access_token, session.refresh_token)
        try {
          const profile = await authService.sync()
          sessionStorage.save({ ...profile, accessToken: session.access_token, refreshToken: session.refresh_token })
          if (!ignore && mountedRef.current) setUser(profile.user)
        } catch {
          // ignore sync errors
        }
      } else if (event === 'SIGNED_OUT') {
        sessionStorage.clear()
        if (!ignore && mountedRef.current) setUser(null)
      } else if (event === 'TOKEN_REFRESHED' && session) {
        sessionStorage.saveTokens(session.access_token, session.refresh_token)
      }
    })

    return () => {
      ignore = true
      subscription.unsubscribe()
    }
  }, [])

  const login = useCallback(async (payload: LoginPayload) => {
    setError(null)
    setNotice(null)
    setIsLoading(true)
    try {
      const session = await authService.login(payload)
      if (!session.accessToken) throw new Error('Login succeeded without an access token')
      sessionStorage.save(session)
      if (mountedRef.current) setUser(session.user)
    } catch (err) {
      const message = getApiErrorMessage(err, 'Unable to sign in. Check your email and password.')
      if (mountedRef.current) setError(message)
      throw err
    } finally {
      if (mountedRef.current) setIsLoading(false)
    }
  }, [])

  const loginWithGoogle = useCallback(async (): Promise<User> => {
    setError(null)
    setNotice(null)
    setIsLoading(true)
    try {
      const { signInWithGooglePopup } = await import('@/frontend/lib/firebase')
      const cred = await signInWithGooglePopup()
      const googleUser = cred.user
      const idToken = await googleUser.getIdToken()

      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: googleUser.email,
          fullName: googleUser.displayName || googleUser.email?.split('@')[0],
          uid: googleUser.uid,
          idToken,
          photoUrl: googleUser.photoURL,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Google authentication failed')
      }

      sessionStorage.save(data)
      if (mountedRef.current) setUser(data.user)
      return data.user
    } catch (err: unknown) {
      const message = getApiErrorMessage(err, 'Google sign-in was cancelled or failed.')
      if (mountedRef.current) setError(message)
      throw err
    } finally {
      if (mountedRef.current) setIsLoading(false)
    }
  }, [])

  const register = useCallback(async (payload: RegisterPayload): Promise<boolean> => {
    setError(null)
    setNotice(null)
    setIsLoading(true)
    try {
      const session = await authService.register(payload)
      if (!session.accessToken) {
        if (mountedRef.current) {
          setNotice('Account created! Check your email to confirm your account, then sign in.')
        }
        return false
      }
      sessionStorage.save(session)
      if (mountedRef.current) setUser(session.user)
      return true
    } catch (err) {
      const message = getApiErrorMessage(err, 'Unable to create account. Please try again.')
      if (mountedRef.current) setError(message)
      throw err
    } finally {
      if (mountedRef.current) setIsLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    sessionStorage.clear()
    if (mountedRef.current) {
      setUser(null)
      setError(null)
      setNotice(null)
    }
    // Also sign out from Supabase & Firebase
    try { await supabase.auth.signOut() } catch { /* ignore */ }
    try {
      const { firebaseSignOut } = await import('@/frontend/lib/firebase')
      await firebaseSignOut()
    } catch { /* ignore */ }
  }, [])

  function updateUser(nextUser: User) {
    setUser(nextUser)
    sessionStorage.saveUser(nextUser)
  }

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAuthenticated: Boolean(user && sessionStorage.getAccessToken()),
    isLoading,
    error,
    notice,
    updateUser,
    login,
    loginWithGoogle,
    register,
    logout,
    clearError: () => setError(null),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [user, isLoading, error, notice, login, loginWithGoogle, register, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
