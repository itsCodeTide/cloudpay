import { NextRequest, NextResponse } from 'next/server'
import { getUserFromHeader } from '@/frontend/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromHeader(req)
    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized session' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      accessToken: null,
      refreshToken: null,
      tokenType: 'bearer',
      expiresIn: 3600,
      user,
    })
  } catch (err: unknown) {
    console.error('[Sync API Error]:', err)
    const message = err instanceof Error ? err.message : 'Sync failed'
    return NextResponse.json({ message }, { status: 500 })
  }
}
