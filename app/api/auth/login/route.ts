import { NextRequest, NextResponse } from 'next/server'
import { supabaseClient, ensureUserProfile } from '@/frontend/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      )
    }

    const cleanEmail = email.trim().toLowerCase()
    const res = await supabaseClient.auth.signInWithPassword({
      email: cleanEmail,
      password,
    })

    if (res.error || !res.data.user || !res.data.session) {
      return NextResponse.json(
        { message: res.error?.message || 'Invalid email or password' },
        { status: 400 }
      )
    }

    const authUser = res.data.user
    const session = res.data.session

    const profile = await ensureUserProfile(
      authUser.id,
      cleanEmail,
      authUser.user_metadata?.full_name,
      authUser.user_metadata?.phone
    )

    return NextResponse.json({
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      tokenType: 'bearer',
      expiresIn: session.expires_in,
      user: profile,
    })
  } catch (err: unknown) {
    console.error('[Login API Error]:', err)
    const message = err instanceof Error ? err.message : 'Login failed'
    return NextResponse.json({ message }, { status: 500 })
  }
}
