import { NextRequest, NextResponse } from 'next/server'
import { getUserFromHeader, supabaseAdmin } from '@/frontend/lib/supabase-server'

function mapBankAccount(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    accountNumber: row.account_number,
    ifscCode: row.ifsc_code,
    bankName: row.bank_name,
    accountHolderName: row.account_holder_name,
    upiId: row.upi_id || null,
    upiName: row.upi_name || row.account_holder_name,
    upiNumber: row.upi_number || null,
    // Balances are deliberately withheld. The balance endpoint reveals them only after PIN verification.
    balance: null,
    primary: Boolean(row.is_primary),
    createdAt: row.created_at,
  }
}

// GET /api/banking — list all bank accounts for authenticated user
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromHeader(req)
    if (!user) return NextResponse.json({ message: 'Authentication required' }, { status: 401 })

    const { data, error } = await supabaseAdmin
      .from('bank_accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('is_primary', { ascending: false })

    if (error) return NextResponse.json({ message: error.message }, { status: 500 })
    return NextResponse.json((data || []).map(mapBankAccount))
  } catch (err: unknown) {
    return NextResponse.json({ message: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}

// POST /api/banking — add a new bank account
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromHeader(req)
    if (!user) return NextResponse.json({ message: 'Authentication required' }, { status: 401 })

    const body = await req.json()
    const { accountNumber, ifscCode, bankName, accountHolderName, upiName, upiNumber, makePrimary } = body

    if (!accountNumber || !ifscCode || !bankName || !accountHolderName) {
      return NextResponse.json({ message: 'All bank account fields are required' }, { status: 400 })
    }

    const { count } = await supabaseAdmin.from('bank_accounts').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
    const shouldBePrimary = Boolean(makePrimary) || (count || 0) === 0

    // If making primary, unset existing primary
    if (shouldBePrimary) {
      await supabaseAdmin
        .from('bank_accounts')
        .update({ is_primary: false })
        .eq('user_id', user.id)
        .eq('is_primary', true)
    }

    const base = String(upiName || accountHolderName).toLowerCase().replace(/[^a-z0-9]/g, '') || 'user'
    const suffix = String(accountNumber).trim().slice(-4)
    let upiId = `${base}${suffix}@cloudpay`
    for (let index = 1; ; index++) {
      const { data: existing } = await supabaseAdmin.from('bank_accounts').select('id').eq('upi_id', upiId).maybeSingle()
      if (!existing) break
      upiId = `${base}${suffix}${index}@cloudpay`
    }

    const { data, error } = await supabaseAdmin
      .from('bank_accounts')
      .insert({
        user_id: user.id,
        account_number: accountNumber.trim(),
        ifsc_code: ifscCode.trim().toUpperCase(),
        bank_name: bankName.trim(),
        account_holder_name: accountHolderName.trim(),
        upi_id: upiId,
        upi_name: String(upiName || accountHolderName).trim(),
        upi_number: upiNumber ? String(upiNumber).trim() : null,
        balance: 0,
        currency: 'INR',
        is_primary: shouldBePrimary,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ message: 'This bank account is already linked to your profile' }, { status: 409 })
      }
      return NextResponse.json({ message: error.message }, { status: 500 })
    }

    return NextResponse.json(mapBankAccount(data), { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ message: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}

// DELETE /api/banking?id=xxx — remove a bank account
export async function DELETE(req: NextRequest) {
  try {
    const user = await getUserFromHeader(req)
    if (!user) return NextResponse.json({ message: 'Authentication required' }, { status: 401 })

    const id = new URL(req.url).searchParams.get('id')
    if (!id) return NextResponse.json({ message: 'Account ID required' }, { status: 400 })

    const { error } = await supabaseAdmin
      .from('bank_accounts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ message: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ message: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const user = await getUserFromHeader(req)
  if (!user) return NextResponse.json({ message: 'Authentication required' }, { status: 401 })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ message: 'Account ID required' }, { status: 400 })
  await supabaseAdmin.from('bank_accounts').update({ is_primary: false }).eq('user_id', user.id)
  const { data, error } = await supabaseAdmin.from('bank_accounts').update({ is_primary: true }).eq('id', id).eq('user_id', user.id).select().single()
  if (error) return NextResponse.json({ message: error.message }, { status: 400 })
  return NextResponse.json(mapBankAccount(data))
}
