import { NextRequest, NextResponse } from 'next/server'
import { getUserFromHeader, supabaseAdmin, mapUser } from '@/frontend/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromHeader(req)
    if (!user) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    if (user.upiId) {
      return NextResponse.json(user)
    }

    const base = user.fullName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user'
    let candidate = `${base}@cloudpay`
    let suffix = 1

    // Ensure candidate UPI is unique
    while (true) {
      const { data } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('upi_id', candidate)
        .single()

      if (!data) break
      candidate = `${base}${suffix++}@cloudpay`
    }

    const { data: updated, error } = await supabaseAdmin
      .from('users')
      .update({ upi_id: candidate, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { message: `Failed to update UPI ID: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json(mapUser(updated))
  } catch (err: unknown) {
    console.error('[Generate UPI API Error]:', err)
    const message = err instanceof Error ? err.message : 'Failed to generate UPI ID'
    return NextResponse.json({ message }, { status: 500 })
  }
}
