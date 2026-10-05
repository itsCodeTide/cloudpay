import { NextRequest, NextResponse } from 'next/server'
import { getUserFromHeader, supabaseAdmin, mapTransaction } from '@/frontend/lib/supabase-server'
import { checkIdempotency, cacheDel } from '@/frontend/lib/redis'
import { kafkaEvents } from '@/frontend/lib/kafka'
import { verifyTransactionPin } from '@/frontend/lib/transaction-pin'

export async function POST(req: NextRequest) {
  try {
    const sender = await getUserFromHeader(req)
    if (!sender) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { receiverUpiId, amount, remark, pin, sourceBankAccountId } = body

    if (!/^\d{4,6}$/.test(pin || '')) {
      return NextResponse.json({ message: 'A 4 to 6 digit transaction PIN is required' }, { status: 400 })
    }
    const { data: senderSecurity } = await supabaseAdmin.from('users').select('transaction_pin_hash').eq('id', sender.id).single()
    if (!senderSecurity?.transaction_pin_hash) return NextResponse.json({ message: 'Set a transaction PIN before sending money' }, { status: 400 })
    if (!verifyTransactionPin(pin, senderSecurity.transaction_pin_hash)) return NextResponse.json({ message: 'Incorrect transaction PIN' }, { status: 400 })

    // Idempotency: prevent duplicate transfers (e.g. network retry)
    const idempotencyKey = req.headers.get('X-Idempotency-Key')
    if (idempotencyKey) {
      const isDuplicate = await checkIdempotency(`tx:${sender.id}:${idempotencyKey}`, 3600)
      if (isDuplicate) {
        return NextResponse.json(
          { message: 'Duplicate request: this payment was already processed.' },
          { status: 409 }
        )
      }
    }

    const numAmount = Number(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { message: 'Transfer amount must be greater than zero' },
        { status: 400 }
      )
    }

    if (!receiverUpiId || !receiverUpiId.trim()) {
      return NextResponse.json(
        { message: 'Receiver UPI ID is required' },
        { status: 400 }
      )
    }

    const cleanReceiverUpi = receiverUpiId.trim().toLowerCase()
    let senderUpi = sender.upiId || `${sender.fullName.toLowerCase().replace(/[^a-z0-9]/g, '')}@cloudpay`

    if (cleanReceiverUpi === senderUpi.toLowerCase()) {
      return NextResponse.json(
        { message: 'Cannot transfer money to your own UPI ID' },
        { status: 400 }
      )
    }

    // 1. Locate receiver
    const { data: receiverBankByUpi } = await supabaseAdmin
      .from('bank_accounts')
      .select('*')
      .ilike('upi_id', cleanReceiverUpi)
      .maybeSingle()
    const { data: receiverByAccount } = receiverBankByUpi
      ? await supabaseAdmin.from('users').select('*').eq('id', receiverBankByUpi.user_id).single()
      : { data: null }
    const { data: receiverByUserUpi, error: receiverError } = receiverBankByUpi
      ? { data: null, error: null }
      : await supabaseAdmin.from('users').select('*').ilike('upi_id', cleanReceiverUpi).maybeSingle()
    const receiverUser = receiverByAccount || receiverByUserUpi

    if ((receiverError && !receiverBankByUpi) || !receiverUser) {
      return NextResponse.json(
        { message: `UPI ID "${cleanReceiverUpi}" was not found. Please verify the address.` },
        { status: 404 }
      )
    }

    // 2. Fetch sender's primary bank account
    const { data: senderAccounts } = await supabaseAdmin
      .from('bank_accounts')
      .select('*')
      .eq('user_id', sender.id)
      .eq(sourceBankAccountId ? 'id' : 'user_id', sourceBankAccountId || sender.id)
      .order('is_primary', { ascending: false })

    if (!senderAccounts || senderAccounts.length === 0) {
      return NextResponse.json(
        { message: 'No linked bank account found for sender' },
        { status: 400 }
      )
    }

    const senderBank = senderAccounts[0]
    senderUpi = senderBank.upi_id || senderUpi
    const currentSenderBalance = Number(senderBank.balance || 0)

    if (currentSenderBalance < numAmount) {
      return NextResponse.json(
        {
          message: `Insufficient balance. Available: ₹${currentSenderBalance.toFixed(
            2
          )}, Requested: ₹${numAmount.toFixed(2)}`,
        },
        { status: 400 }
      )
    }

    // 3. Fetch or initialize receiver's bank account
    let receiverBank: any = receiverBankByUpi || null
    const { data: receiverAccounts } = await supabaseAdmin
      .from('bank_accounts')
      .select('*')
      .eq('user_id', receiverUser.id)
      .order('is_primary', { ascending: false })

    if (!receiverBank && (!receiverAccounts || receiverAccounts.length === 0)) {
      const { data: newBank } = await supabaseAdmin
        .from('bank_accounts')
        .insert({
          user_id: receiverUser.id,
          account_number: '9876' + Math.floor(10000000 + Math.random() * 90000000),
          ifsc_code: 'CLOD0001234',
          bank_name: 'State Bank of India',
          account_holder_name: receiverUser.full_name,
          balance: 0,
          currency: 'INR',
          is_primary: true,
        })
        .select()
        .single()
      receiverBank = newBank
    } else if (!receiverBank) {
      receiverBank = receiverAccounts?.[0]
    }

    const currentReceiverBalance = Number(receiverBank.balance || 0)

    // 4. Update balances in database
    const newSenderBal = currentSenderBalance - numAmount
    const newReceiverBal = currentReceiverBalance + numAmount

    await supabaseAdmin
      .from('bank_accounts')
      .update({ balance: newSenderBal, updated_at: new Date().toISOString() })
      .eq('id', senderBank.id)

    await supabaseAdmin
      .from('bank_accounts')
      .update({ balance: newReceiverBal, updated_at: new Date().toISOString() })
      .eq('id', receiverBank.id)

    // 5. Create transaction record
    const txRef = `CP${Date.now()}${Math.floor(100 + Math.random() * 900)}`
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
        transaction_type: 'UPI_TRANSFER',
        status: 'SUCCESS',
        remark: remark?.trim() || null,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (txError) {
      console.error('[Transaction Insert Error]:', txError)
      return NextResponse.json(
        { message: `Payment failed: ${txError.message}` },
        { status: 500 }
      )
    }

    // 6. Create notifications in Supabase
    await supabaseAdmin.from('notifications').insert([
      {
        user_id: sender.id,
        title: 'Money Sent Successfully',
        message: `You sent ₹${numAmount.toFixed(2)} to ${receiverUser.full_name} (${receiverUser.upi_id}). Ref: ${txRef}`,
        type: 'PAYMENT_SENT',
        is_read: false,
      },
      {
        user_id: receiverUser.id,
        title: 'Money Received',
        message: `You received ₹${numAmount.toFixed(2)} from ${sender.fullName} (${senderUpi}). Ref: ${txRef}`,
        type: 'PAYMENT_RECEIVED',
        is_read: false,
      },
    ])

    // Invalidate cached dashboard for both users
    await Promise.allSettled([
      cacheDel(`dashboard:${sender.id}`),
      cacheDel(`dashboard:${receiverUser.id}`),
    ])

    // Publish Kafka event (async, non-blocking)
    kafkaEvents.paymentSuccess(txRef, senderUpi, receiverBank.upi_id || receiverUser.upi_id, numAmount).catch(() => {})

    return NextResponse.json(mapTransaction(txRow))
  } catch (err: unknown) {
    console.error('[Send Transaction API Error]:', err)
    const message = err instanceof Error ? err.message : 'Transaction failed'
    return NextResponse.json({ message }, { status: 500 })
  }
}
