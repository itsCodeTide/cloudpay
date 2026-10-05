import { NextRequest, NextResponse } from 'next/server'
import { getUserFromHeader, supabaseAdmin } from '@/frontend/lib/supabase-server'

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromHeader(req)
    if (!user) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const accountId = new URL(req.url).searchParams.get('accountId')
    let account: any = null
    if (accountId) {
      const { data } = await supabaseAdmin.from('bank_accounts').select('*').eq('id', accountId).eq('user_id', user.id).single()
      account = data
    }
    let upiId = account?.upi_id || user.upiId
    const upiName = account?.upi_name || user.fullName
    const upiNumber = account?.upi_number || null
    if (!upiId) {
      const base = user.fullName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user'
      upiId = `${base}@cloudpay`
      await supabaseAdmin.from('users').update({ upi_id: upiId }).eq('id', user.id)
    }

    const payload = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiName)}&cu=INR`

    return NextResponse.json({
      upiId,
      upiName,
      upiNumber,
      bankAccountId: account?.id || null,
      payload,
      format: 'UPI_QR',
    })
  } catch (err: unknown) {
    console.error('[QR Generate API Error]:', err)
    const message = err instanceof Error ? err.message : 'Failed to generate QR'
    return NextResponse.json({ message }, { status: 500 })
  }
}
