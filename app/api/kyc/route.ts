import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getUserFromHeader, supabaseAdmin } from '@/frontend/lib/supabase-server'

function mapKyc(row: any) {
  return {
    id: row.id,
    status: row.status,
    provider: row.provider,
    externalReference: row.external_reference,
    legalName: row.legal_name,
    governmentIdLast4: row.government_id_last4 || null,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at || null,
    rejectionReason: row.rejection_reason || null,
  }
}

export async function GET(req: NextRequest) {
  const user = await getUserFromHeader(req)
  if (!user) return NextResponse.json({ message: 'Authentication required' }, { status: 401 })
  const { data, error } = await supabaseAdmin.from('kyc_verifications').select('*').eq('user_id', user.id).order('submitted_at', { ascending: false }).limit(1).maybeSingle()
  if (error) return NextResponse.json({ message: error.message }, { status: 500 })
  return NextResponse.json(data ? mapKyc(data) : null)
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromHeader(req)
    if (!user) return NextResponse.json({ message: 'Authentication required' }, { status: 401 })
    const body = await req.json()
    const legalName = String(body.legalName || '').trim()
    const governmentIdLast4 = String(body.governmentIdLast4 || '').trim()
    const dateOfBirth = body.dateOfBirth ? String(body.dateOfBirth) : null
    if (legalName.length < 2 || legalName.length > 150) return NextResponse.json({ message: 'Enter your legal name' }, { status: 400 })
    if (!/^\d{4}$/.test(governmentIdLast4)) return NextResponse.json({ message: 'Enter only the last four digits of your government ID' }, { status: 400 })
    if (body.consent !== true) return NextResponse.json({ message: 'Consent is required to submit KYC' }, { status: 400 })
    if (dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) return NextResponse.json({ message: 'Enter a valid date of birth' }, { status: 400 })

    const externalReference = `CPKYC_${crypto.randomUUID().replaceAll('-', '')}`
    const { data, error } = await supabaseAdmin.from('kyc_verifications').insert({
      user_id: user.id,
      status: 'SUBMITTED',
      provider: 'CLOUDPAY_REVIEW',
      external_reference: externalReference,
      legal_name: legalName,
      date_of_birth: dateOfBirth,
      government_id_last4: governmentIdLast4,
      consented_at: new Date().toISOString(),
      metadata: { raw_documents_stored: false },
    }).select().single()
    if (error) return NextResponse.json({ message: error.message }, { status: 500 })

    await supabaseAdmin.from('users').update({ kyc_status: 'SUBMITTED', kyc_provider: 'CLOUDPAY_REVIEW', kyc_reference: externalReference, kyc_submitted_at: new Date().toISOString() }).eq('id', user.id)
    return NextResponse.json(mapKyc(data), { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ message: err instanceof Error ? err.message : 'Unable to submit KYC' }, { status: 500 })
  }
}
