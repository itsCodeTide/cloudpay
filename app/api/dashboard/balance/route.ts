import { NextRequest, NextResponse } from 'next/server'
import { getUserFromHeader, supabaseAdmin } from '@/frontend/lib/supabase-server'
import { verifyTransactionPin } from '@/frontend/lib/transaction-pin'
import { rateLimit } from '@/frontend/lib/redis'

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromHeader(req)
    if (!user) return NextResponse.json({ message: 'Authentication required' }, { status: 401 })

    const limit = await rateLimit(`balance-check:${user.id}`, 10, 300)
    if (!limit.allowed) return NextResponse.json({ message: 'Too many balance checks. Try again later.' }, { status: 429 })

    const { pin } = await req.json()
    if (!/^\d{4,6}$/.test(pin || '')) return NextResponse.json({ message: 'Enter your 4 to 6 digit PIN' }, { status: 400 })

    const { data: security, error: securityError } = await supabaseAdmin.from('users').select('transaction_pin_hash').eq('id', user.id).single()
    if (securityError) return NextResponse.json({ message: securityError.message }, { status: 500 })
    if (!security?.transaction_pin_hash) return NextResponse.json({ message: 'Set a transaction PIN before checking balance' }, { status: 400 })
    if (!verifyTransactionPin(pin, security.transaction_pin_hash)) return NextResponse.json({ message: 'Incorrect transaction PIN' }, { status: 400 })

    const { data: accounts, error } = await supabaseAdmin.from('bank_accounts').select('id,bank_name,account_number,balance,is_primary').eq('user_id', user.id).order('is_primary', { ascending: false })
    if (error) return NextResponse.json({ message: error.message }, { status: 500 })

    const rows = (accounts || []).map(account => ({
      id: account.id,
      bankName: account.bank_name,
      accountNumber: `••••${String(account.account_number).slice(-4)}`,
      balance: Number(account.balance || 0),
      primary: Boolean(account.is_primary),
    }))
    return NextResponse.json({
      availableBalance: rows.reduce((sum, account) => sum + account.balance, 0),
      accounts: rows,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    })
  } catch (err: unknown) {
    return NextResponse.json({ message: err instanceof Error ? err.message : 'Unable to check balance' }, { status: 500 })
  }
}
