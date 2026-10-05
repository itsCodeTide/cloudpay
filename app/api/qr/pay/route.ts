import { NextRequest, NextResponse } from 'next/server'
import { getUserFromHeader, supabaseAdmin, mapTransaction } from '@/frontend/lib/supabase-server'
import { cacheDel } from '@/frontend/lib/redis'
import { verifyTransactionPin } from '@/frontend/lib/transaction-pin'

export async function POST(req: NextRequest) {
  try {
    const sender = await getUserFromHeader(req)
    if (!sender) return NextResponse.json({ message: 'Authentication required' }, { status: 401 })

    const body = await req.json()
    const { payload, amount, remark, pin, sourceBankAccountId } = body
    if (!/^\d{4,6}$/.test(pin || '')) {
      return NextResponse.json({ message: 'A 4 to 6 digit transaction PIN is required' }, { status: 400 })
    }

    const { data: senderSecurity } = await supabaseAdmin
      .from('users')
      .select('transaction_pin_hash')
      .eq('id', sender.id)
      .single()
    if (!senderSecurity?.transaction_pin_hash) return NextResponse.json({ message: 'Set a transaction PIN before paying by QR' }, { status: 400 })
    if (!verifyTransactionPin(pin, senderSecurity.transaction_pin_hash)) return NextResponse.json({ message: 'Incorrect transaction PIN' }, { status: 400 })

    const numAmount = Number(amount)
    if (!Number.isFinite(numAmount) || numAmount <= 0) return NextResponse.json({ message: 'Transfer amount must be greater than zero' }, { status: 400 })
    if (!payload || typeof payload !== 'string') return NextResponse.json({ message: 'Invalid QR payload' }, { status: 400 })

    let receiverUpiId = ''
    try {
      if (payload.includes('?')) {
        const url = new URL(payload.replace(/^(upi|cloudpay):\/\//, 'http://dummy.com/'))
        receiverUpiId = url.searchParams.get('pa') || url.searchParams.get('upiId') || ''
      } else if (payload.includes('@')) {
        receiverUpiId = payload.trim()
      }
    } catch {
      const match = payload.match(/[a-zA-Z0-9._-]+@[a-zA-Z0-9]+/i)
      if (match) receiverUpiId = match[0]
    }
    if (!receiverUpiId) return NextResponse.json({ message: 'Unable to detect a valid UPI ID in QR payload' }, { status: 400 })

    const cleanReceiverUpi = receiverUpiId.trim().toLowerCase()
    const { data: senderAccounts } = await supabaseAdmin
      .from('bank_accounts')
      .select('*')
      .eq('user_id', sender.id)
      .order('is_primary', { ascending: false })
    const senderBank = sourceBankAccountId
      ? senderAccounts?.find(account => account.id === sourceBankAccountId)
      : senderAccounts?.[0]
    if (!senderBank) return NextResponse.json({ message: 'Selected source bank account was not found' }, { status: 400 })

    const senderUpi = senderBank.upi_id || sender.upiId || `${sender.fullName.toLowerCase().replace(/[^a-z0-9]/g, '')}@cloudpay`
    if (cleanReceiverUpi === senderUpi.toLowerCase() || cleanReceiverUpi === sender.upiId?.toLowerCase()) {
      return NextResponse.json({ message: 'Cannot pay to your own QR code' }, { status: 400 })
    }

    const { data: receiverBankByUpi } = await supabaseAdmin
      .from('bank_accounts')
      .select('*')
      .ilike('upi_id', cleanReceiverUpi)
      .maybeSingle()
    const { data: receiverByBank } = receiverBankByUpi
      ? await supabaseAdmin.from('users').select('*').eq('id', receiverBankByUpi.user_id).single()
      : { data: null }
    const { data: receiverByUser } = receiverByBank
      ? { data: null }
      : await supabaseAdmin.from('users').select('*').ilike('upi_id', cleanReceiverUpi).maybeSingle()
    const receiverUser = receiverByBank || receiverByUser
    if (!receiverUser) return NextResponse.json({ message: `UPI ID "${cleanReceiverUpi}" not found.` }, { status: 404 })
    if (receiverUser.id === sender.id) return NextResponse.json({ message: 'Cannot pay to your own QR code' }, { status: 400 })

    let receiverBank: any = receiverBankByUpi || null
    if (!receiverBank) {
      const { data: receiverAccounts } = await supabaseAdmin
        .from('bank_accounts')
        .select('*')
        .eq('user_id', receiverUser.id)
        .order('is_primary', { ascending: false })
      receiverBank = receiverAccounts?.[0] || null
    }
    if (!receiverBank) {
      const receiverHandle = receiverUser.full_name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user'
      const accountNumber = '9876' + Math.floor(10000000 + Math.random() * 90000000)
      const { data: newBank, error: bankError } = await supabaseAdmin
        .from('bank_accounts')
        .insert({
          user_id: receiverUser.id,
          account_number: accountNumber,
          ifsc_code: 'CLOD0001234',
          bank_name: 'State Bank of India',
          account_holder_name: receiverUser.full_name,
          upi_id: `${receiverHandle}${accountNumber.slice(-4)}@cloudpay`,
          upi_name: receiverUser.full_name,
          upi_number: null,
          balance: 0,
          currency: 'INR',
          is_primary: true,
        })
        .select()
        .single()
      if (bankError || !newBank) return NextResponse.json({ message: 'Unable to initialize the receiver account' }, { status: 500 })
      receiverBank = newBank
    }

    const currentSenderBalance = Number(senderBank.balance || 0)
    if (currentSenderBalance < numAmount) return NextResponse.json({ message: `Insufficient balance. Available: ₹${currentSenderBalance.toFixed(2)}` }, { status: 400 })

    const currentReceiverBalance = Number(receiverBank.balance || 0)
    const now = new Date().toISOString()
    const { error: senderUpdateError } = await supabaseAdmin
      .from('bank_accounts')
      .update({ balance: currentSenderBalance - numAmount, updated_at: now })
      .eq('id', senderBank.id)
    const { error: receiverUpdateError } = await supabaseAdmin
      .from('bank_accounts')
      .update({ balance: currentReceiverBalance + numAmount, updated_at: now })
      .eq('id', receiverBank.id)
    if (senderUpdateError || receiverUpdateError) return NextResponse.json({ message: 'Payment failed while updating account balances' }, { status: 500 })

    const txRef = `CPQR${Date.now()}`
    const { data: txRow, error: txError } = await supabaseAdmin
      .from('transactions')
      .insert({
        transaction_ref: txRef,
        sender_id: sender.id,
        receiver_id: receiverUser.id,
        sender_upi_id: senderUpi,
        receiver_upi_id: receiverBank.upi_id || receiverUser.upi_id,
        amount: numAmount,
        currency: 'INR',
        transaction_type: 'QR_PAYMENT',
        status: 'SUCCESS',
        remark: remark?.trim() || 'QR Payment',
        completed_at: now,
      })
      .select()
      .single()
    if (txError || !txRow) return NextResponse.json({ message: `Payment failed: ${txError?.message || 'transaction could not be recorded'}` }, { status: 500 })

    await supabaseAdmin.from('notifications').insert([
      { user_id: sender.id, title: 'QR Payment Completed', message: `Paid ₹${numAmount.toFixed(2)} to ${receiverUser.full_name}. Ref: ${txRef}`, type: 'PAYMENT_SENT', is_read: false },
      { user_id: receiverUser.id, title: 'QR Payment Received', message: `Received ₹${numAmount.toFixed(2)} from ${sender.fullName}. Ref: ${txRef}`, type: 'PAYMENT_RECEIVED', is_read: false },
    ])
    await Promise.allSettled([cacheDel(`dashboard:${sender.id}`), cacheDel(`dashboard:${receiverUser.id}`)])

    return NextResponse.json(mapTransaction(txRow))
  } catch (err: unknown) {
    console.error('[QR Pay API Error]:', err)
    return NextResponse.json({ message: err instanceof Error ? err.message : 'QR payment failed' }, { status: 500 })
  }
}
