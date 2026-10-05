import Razorpay from 'razorpay'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getUserFromHeader, supabaseAdmin } from '@/frontend/lib/supabase-server'
import { cacheDel } from '@/frontend/lib/redis'

export async function POST(req: NextRequest) {
  try {
    const { amount, currency = 'INR', receipt, notes } = await req.json()

    if (!amount || Number(amount) < 1) {
      return NextResponse.json({ error: 'Invalid amount. Minimum ₹1.' }, { status: 400 })
    }

    const keyId = process.env.RAZORPAY_KEY_ID ?? ''
    const keySecret = process.env.RAZORPAY_KEY_SECRET ?? ''

    // Demo mode if keys not configured
    if (!keyId || !keySecret || keySecret === 'PASTE_YOUR_RAZORPAY_KEY_SECRET_HERE') {
      return NextResponse.json({
        id: `order_demo_${Date.now()}`,
        amount: Math.round(Number(amount) * 100),
        currency,
        receipt: receipt ?? `rcpt_${Date.now()}`,
        status: 'created',
        demo: true,
        key: keyId || 'rzp_test_demo',
      })
    }

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret })
    const order = await razorpay.orders.create({
      amount: Math.round(Number(amount) * 100), // paise
      currency,
      receipt: receipt ?? `rcpt_${Date.now()}`,
      notes: notes ?? {},
    })

    return NextResponse.json({ ...order, key: keyId })
  } catch (err: unknown) {
    console.error('[Razorpay] create order error:', err)
    const message = err instanceof Error ? err.message : 'Failed to create payment order'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = await req.json()
    const keySecret = process.env.RAZORPAY_KEY_SECRET ?? ''

    let verified = false
    // Demo mode
    if (!keySecret || keySecret === 'PASTE_YOUR_RAZORPAY_KEY_SECRET_HERE') {
      verified = true
    } else {
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return NextResponse.json({ error: 'Missing payment verification params' }, { status: 400 })
      }

      const body = `${razorpay_order_id}|${razorpay_payment_id}`
      const expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(body)
        .digest('hex')

      if (expectedSignature !== razorpay_signature) {
        return NextResponse.json({ error: 'Invalid payment signature — possible tampering' }, { status: 400 })
      }
      verified = true
    }

    if (verified) {
      // Credit user's bank account if user is authenticated and amount provided
      const user = await getUserFromHeader(req)
      const numAmount = Number(amount)
      if (user && numAmount > 0) {
        const { data: accounts } = await supabaseAdmin
          .from('bank_accounts')
          .select('*')
          .eq('user_id', user.id)
          .order('is_primary', { ascending: false })

        let targetBank = accounts && accounts.length > 0 ? accounts[0] : null
        if (!targetBank) {
          const { data: newBank } = await supabaseAdmin
            .from('bank_accounts')
            .insert({
              user_id: user.id,
              account_number: '9876' + Math.floor(10000000 + Math.random() * 90000000),
              ifsc_code: 'CLOD0001234',
              bank_name: 'State Bank of India',
              account_holder_name: user.fullName,
              balance: 0,
              currency: 'INR',
              is_primary: true,
            })
            .select()
            .single()
          targetBank = newBank
        }

        if (targetBank) {
          const newBal = Number(targetBank.balance || 0) + numAmount
          await supabaseAdmin
            .from('bank_accounts')
            .update({ balance: newBal, updated_at: new Date().toISOString() })
            .eq('id', targetBank.id)

          await supabaseAdmin.from('notifications').insert({
            user_id: user.id,
            title: 'Payment Received via Razorpay',
            message: `₹${numAmount.toFixed(2)} added to your ${targetBank.bank_name} account. (Ref: ${razorpay_payment_id || 'demo'})`,
            type: 'PAYMENT_RECEIVED',
            is_read: false,
          })

          await cacheDel(`dashboard:${user.id}`)
        }
      }

      return NextResponse.json({ verified: true, demo: !keySecret || keySecret === 'PASTE_YOUR_RAZORPAY_KEY_SECRET_HERE', paymentId: razorpay_payment_id, credited: !!user })
    }

    return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 })
  } catch (err: unknown) {
    console.error('[Razorpay] verify error:', err)
    const message = err instanceof Error ? err.message : 'Payment verification failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

