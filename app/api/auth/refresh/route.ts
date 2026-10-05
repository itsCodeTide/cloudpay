import { NextRequest, NextResponse } from 'next/server'
import { supabaseClient, ensureUserProfile } from '@/frontend/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { refreshToken } = body

    if (!refreshToken) {
      return NextResponse.json(
        { message: 'Refresh token is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseClient.auth.refreshSession({
      refresh_token: refreshToken,
    })

    if (error || !data.session || !data.user) {
      return NextResponse.json(
        { message: error?.message || 'Invalid or expired refresh token' },
        { status: 401 }
      )
    }

    const profile = await ensureUserProfile(
      data.user.id,
      data.user.email || '',
      data.user.user_metadata?.full_name,
      data.user.user_metadata?.phone
    )

    return NextResponse.json({
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      tokenType: 'bearer',
      expiresIn: data.session.expires_in,
      user: profile,
    })
  } catch (err: unknown) {
    console.error('[Refresh API Error]:', err)
    const message = err instanceof Error ? err.message : 'Token refresh failed'
    return NextResponse.json({ message }, { status: 500 })
  }
}
