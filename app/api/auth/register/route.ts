import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, supabaseClient, ensureUserProfile } from '@/frontend/lib/supabase-server'
import { kafkaEvents } from '@/frontend/lib/kafka'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, fullName, phone } = body

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      )
    }

    const cleanEmail = email.trim().toLowerCase()
    const cleanName = fullName?.trim() || cleanEmail.split('@')[0]
    const cleanPhone = phone?.trim() || null

    // 1. Try to create user via Admin API with auto-confirmation (skips email rate-limits)
    let authUser: any = null
    const createRes = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: cleanName,
        phone: cleanPhone,
      },
    })

    if (createRes.data?.user) {
      authUser = createRes.data.user
    } else {
      // Check if user already registered
      if (createRes.error?.message?.includes('already registered')) {
        // Try sign in to verify credentials
        const signInRes = await supabaseClient.auth.signInWithPassword({
          email: cleanEmail,
          password,
        })
        if (signInRes.data?.user && signInRes.data?.session) {
          const profile = await ensureUserProfile(
            signInRes.data.user.id,
            cleanEmail,
            cleanName,
            cleanPhone
          )
          return NextResponse.json({
            accessToken: signInRes.data.session.access_token,
            refreshToken: signInRes.data.session.refresh_token,
            tokenType: 'bearer',
            expiresIn: signInRes.data.session.expires_in,
            user: profile,
          })
        }
        return NextResponse.json(
          { message: 'An account with this email already exists. Please log in.' },
          { status: 409 }
        )
      }

      // Fallback: standard signup
      const fallbackRes = await supabaseClient.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: { full_name: cleanName, phone: cleanPhone },
        },
      })
      if (fallbackRes.error) {
        return NextResponse.json(
          { message: fallbackRes.error.message },
          { status: 400 }
        )
      }
      authUser = fallbackRes.data.user
    }

    if (!authUser) {
      return NextResponse.json(
        { message: 'Unable to initialize user account with Supabase' },
        { status: 500 }
      )
    }

    // 2. Sign in to obtain session tokens
    const sessionRes = await supabaseClient.auth.signInWithPassword({
      email: cleanEmail,
      password,
    })

    const session = sessionRes.data?.session
    // 3. Store user in Supabase public.users and seed initial bank account
    const profile = await ensureUserProfile(
      authUser.id,
      cleanEmail,
      cleanName,
      cleanPhone
    )

    // Publish event to Kafka (non-blocking)
    kafkaEvents.userRegistered(profile.id, profile.email, profile.upiId || '').catch(() => {})

    return NextResponse.json({
      accessToken: session?.access_token || null,
      refreshToken: session?.refresh_token || null,
      tokenType: 'bearer',
      expiresIn: session?.expires_in || 3600,
      user: profile,
    })
  } catch (err: unknown) {
    console.error('[Register API Error]:', err)
    const message = err instanceof Error ? err.message : 'Registration failed'
    return NextResponse.json({ message }, { status: 500 })
  }
}
