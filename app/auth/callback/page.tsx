'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AlertCircle, Loader2, Zap } from 'lucide-react'
import { supabase } from '@/frontend/lib/supabase'
import { authService } from '@/frontend/services/auth.service'
import { sessionStorage } from '@/frontend/services/api-client'

export default function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function completeLogin() {
      try {
        const code = new URLSearchParams(window.location.search).get('code')
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          if (exchangeError) throw exchangeError
        }
        const { data, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError
        if (!data.session) throw new Error('Google sign-in did not create a session')
        sessionStorage.saveTokens(data.session.access_token, data.session.refresh_token)
        const profile = await authService.sync()
        sessionStorage.save({ ...profile, accessToken: data.session.access_token, refreshToken: data.session.refresh_token })
        window.location.replace('/')
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Unable to complete Google sign-in')
      }
    }
    completeLogin()
    return () => { active = false }
  }, [])

  return <main className="grid min-h-screen place-items-center bg-muted/30 p-4"><div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm"><div className="mx-auto grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground"><Zap className="size-5" fill="currentColor" /></div>{error ? <><div role="alert" className="mt-5 flex gap-2 rounded-lg bg-destructive/10 p-3 text-left text-sm text-destructive"><AlertCircle className="size-4 shrink-0" />{error}</div><Link href="/login" className="mt-5 inline-block text-sm font-medium text-primary hover:underline">Return to sign in</Link></> : <><Loader2 className="mx-auto mt-6 size-6 animate-spin text-primary" /><p className="mt-3 text-sm text-muted-foreground">Completing secure Google sign-in...</p></>}</div></main>
}
