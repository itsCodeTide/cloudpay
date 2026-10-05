import { createClient } from '@supabase/supabase-js'
import type { User, Transaction, DashboardResponse, GenerateQrResponse } from '@/frontend/types'
import { NextRequest } from 'next/server'
import crypto from 'crypto'

function requiredEnv(...names: string[]) {
  const value = names.map(name => process.env[name]).find(Boolean)
  if (!value) throw new Error(`Missing required environment variable: ${names.join(' or ')}`)
  return value
}

const supabaseUrl = requiredEnv('SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL')
const supabaseSecret = requiredEnv('SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY')
const supabaseAnon = requiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')

// Admin client for backend operations (bypasses RLS to reliably manage tables)
export const supabaseAdmin = createClient(supabaseUrl, supabaseSecret, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Standard client for public/auth calls
export const supabaseClient = createClient(supabaseUrl, supabaseAnon)

export function mapUser(row: any): User {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name || row.email?.split('@')[0] || 'CloudPay User',
    phone: row.phone || null,
    upiId: row.upi_id || null,
    role: row.role || 'USER',
    kycVerified: Boolean(row.kyc_verified),
    kycStatus: row.kyc_status || (row.kyc_verified ? 'VERIFIED' : 'NOT_STARTED'),
    pendingEmail: row.pending_email || null,
    createdAt: row.created_at || new Date().toISOString(),
  }
}

export function mapTransaction(row: any): Transaction {
  return {
    id: row.id,
    transactionRef: row.transaction_ref,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    senderUpiId: row.sender_upi_id,
    receiverUpiId: row.receiver_upi_id,
    amount: Number(row.amount),
    remark: row.remark || null,
    status: row.status,
    createdAt: row.created_at,
    completedAt: row.completed_at || row.updated_at || null,
  }
}

/**
 * Ensures user profile exists in public.users and provides a default bank account
 */
export async function ensureUserProfile(
  userId: string,
  email: string,
  fullName?: string,
  phone?: string
): Promise<User> {
  // Check if profile exists
  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  const safeFullName = fullName?.trim() || existing?.full_name || email.split('@')[0]
  const cleanHandle = safeFullName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user'
  const defaultUpi = `${cleanHandle}@cloudpay`

  let userRow = existing
  if (!userRow) {
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: userId,
        email: email.toLowerCase(),
        full_name: safeFullName,
        phone: phone?.trim() || null,
        upi_id: defaultUpi,
        role: 'USER',
        is_verified: true,
      })
      .select()
      .single()

    if (insertError) {
      console.error('[SupabaseServer] Failed to insert profile:', insertError)
      throw new Error(`Profile creation failed: ${insertError.message}`)
    }
    userRow = inserted
  } else if (email && userRow.email !== email.toLowerCase()) {
    // Supabase only reaches this branch after the user confirms an email change.
    const { data: updated } = await supabaseAdmin.from('users').update({
      email: email.toLowerCase(),
      pending_email: null,
      email_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', userId).select().single()
    if (updated) userRow = updated
  }

  // Ensure default bank account exists
  const { data: existingBank } = await supabaseAdmin
    .from('bank_accounts')
    .select('id')
    .eq('user_id', userId)
    .limit(1)

  if (!existingBank || existingBank.length === 0) {
    const randomAcc = '9876' + Math.floor(10000000 + Math.random() * 90000000)
    await supabaseAdmin.from('bank_accounts').insert({
      user_id: userId,
      account_number: randomAcc,
      ifsc_code: 'CLOD0001234',
      bank_name: 'State Bank of India',
      account_holder_name: safeFullName,
      upi_id: `${cleanHandle}${randomAcc.slice(-4)}@cloudpay`,
      upi_name: safeFullName,
      upi_number: null,
      balance: 50000.0, // initial test balance
      currency: 'INR',
      is_primary: true,
    })
  }

  return mapUser(userRow)
}

/**
 * Sign an internal HS256 JWT for session management (used for Google OAuth and testing)
 */
export function signUserToken(
  userId: string,
  email: string,
  role = 'USER',
  expiresInSeconds = 86400
): string {
  const secret =
    process.env.JWT_SECRET ||
    'cloudpay-jwt-secret-key-for-local-dev-min-256-bits-long-replace-in-prod'
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  const payload = Buffer.from(
    JSON.stringify({
      sub: userId,
      email,
      role,
      iss: 'cloudpay',
      iat: now,
      exp: now + expiresInSeconds,
    })
  ).toString('base64url')

  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest('base64url')

  return `${header}.${payload}.${signature}`
}

export function verifyUserToken(
  token: string
): { sub: string; email: string; role?: string } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [header, payload, signature] = parts
    const secret =
      process.env.JWT_SECRET ||
      'cloudpay-jwt-secret-key-for-local-dev-min-256-bits-long-replace-in-prod'
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(`${header}.${payload}`)
      .digest('base64url')

    if (signature !== expectedSig) return null

    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    const now = Math.floor(Date.now() / 1000)
    if (data.exp && data.exp < now) return null
    return data
  } catch {
    return null
  }
}

export async function getUserFromHeader(
  req: Request | NextRequest | { headers: { get(name: string): string | null } }
): Promise<User | null> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7).trim()
  if (!token) return null

  // 1. Check custom HS256 signed CloudPay JWT (Google OAuth, developer tokens)
  const verified = verifyUserToken(token)
  if (verified && verified.sub) {
    const { data: userRow } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', verified.sub)
      .single()

    if (userRow) {
      return mapUser(userRow)
    }
  }

  // 2. Verify token with Supabase Auth
  const { data: authData } = await supabaseAdmin.auth.getUser(token)
  if (authData?.user) {
    const user = authData.user
    return ensureUserProfile(
      user.id,
      user.email || '',
      user.user_metadata?.full_name,
      user.user_metadata?.phone
    )
  }

  // 3. Fallback: unverified payload extraction for developer testing / demo tokens
  try {
    const parts = token.split('.')
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
      if (payload && payload.sub) {
        const { data: userRow } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('id', payload.sub)
          .single()
        if (userRow) return mapUser(userRow)
      }
    }
  } catch {}

  return null
}
