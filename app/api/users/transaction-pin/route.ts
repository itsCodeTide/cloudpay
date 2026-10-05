import { NextRequest, NextResponse } from 'next/server'
import { getUserFromHeader, supabaseAdmin } from '@/frontend/lib/supabase-server'
import { hashTransactionPin, verifyTransactionPin } from '@/frontend/lib/transaction-pin'
import { rateLimit } from '@/frontend/lib/redis'

export async function GET(req: NextRequest) {
  const user = await getUserFromHeader(req)
  if (!user) return NextResponse.json({ message: 'Authentication required' }, { status: 401 })
  const { data, error } = await supabaseAdmin.from('users').select('transaction_pin_hash').eq('id', user.id).single()
  if (error) return NextResponse.json({ message: error.message }, { status: 500 })
  return NextResponse.json({ configured: Boolean(data?.transaction_pin_hash) })
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromHeader(req)
    if (!user) return NextResponse.json({ message: 'Authentication required' }, { status: 401 })
    const limit = await rateLimit(`pin-update:${user.id}`, 5, 900)
    if (!limit.allowed) return NextResponse.json({ message: 'Too many PIN attempts. Try again later.' }, { status: 429 })

    const { pin, confirmPin, currentPin } = await req.json()
    if (!/^\d{4,6}$/.test(pin || '') || pin !== confirmPin) {
      return NextResponse.json({ message: 'PIN must be 4 to 6 digits and match confirmation' }, { status: 400 })
    }
    const { data: security, error: readError } = await supabaseAdmin.from('users').select('transaction_pin_hash').eq('id', user.id).single()
    if (readError) return NextResponse.json({ message: readError.message }, { status: 500 })
    if (security?.transaction_pin_hash && (!/^\d{4,6}$/.test(currentPin || '') || !verifyTransactionPin(currentPin, security.transaction_pin_hash))) {
      return NextResponse.json({ message: 'Enter your current PIN to replace it' }, { status: 400 })
    }
    const { error } = await supabaseAdmin.from('users').update({ transaction_pin_hash: hashTransactionPin(pin) }).eq('id', user.id)
    if (error) return NextResponse.json({ message: error.message }, { status: 500 })
    return NextResponse.json({ configured: true })
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Unable to save transaction PIN' }, { status: 500 })
  }
}
