import { NextRequest, NextResponse } from 'next/server'
import { getUserFromHeader, mapUser, supabaseAdmin } from '@/frontend/lib/supabase-server'

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromHeader(req)
    if (!user) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    return NextResponse.json(user)
  } catch (err: unknown) {
    console.error('[Users Me API Error]:', err)
    const message = err instanceof Error ? err.message : 'Failed to fetch user'
    return NextResponse.json({ message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getUserFromHeader(req)
    if (!user) return NextResponse.json({ message: 'Authentication required' }, { status: 401 })

    const body = await req.json()
    const fullName = String(body.fullName || '').trim()
    const phone = String(body.phone || '').trim()
    const email = String(body.email || '').trim().toLowerCase()
    if (fullName.length < 2 || fullName.length > 150) return NextResponse.json({ message: 'Name must be between 2 and 150 characters' }, { status: 400 })
    if (!/^\+?[0-9 ()-]{7,20}$/.test(phone)) return NextResponse.json({ message: 'Enter a valid phone number' }, { status: 400 })
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ message: 'Enter a valid email address' }, { status: 400 })

    const { data: existingEmail } = await supabaseAdmin.from('users').select('id').ilike('email', email).neq('id', user.id).maybeSingle()
    if (existingEmail) return NextResponse.json({ message: 'That email address is already in use' }, { status: 409 })

    const emailChanged = email !== user.email.toLowerCase()
    if (emailChanged) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        email,
        email_confirm: false,
        user_metadata: { full_name: fullName, phone },
      })
      if (authError) return NextResponse.json({ message: `Email update could not be started: ${authError.message}` }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin.from('users').update({
      full_name: fullName,
      phone,
      pending_email: emailChanged ? email : null,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id).select().single()
    if (error) return NextResponse.json({ message: error.message }, { status: 500 })

    return NextResponse.json({ user: mapUser(data), emailChangePending: emailChanged })
  } catch (err: unknown) {
    return NextResponse.json({ message: err instanceof Error ? err.message : 'Unable to update profile' }, { status: 500 })
  }
}
