import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, ensureUserProfile, signUserToken } from '@/frontend/lib/supabase-server'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, fullName, uid, idToken, photoUrl } = body

    if (!email) {
      return NextResponse.json(
        { message: 'Email is required for Google authentication' },
        { status: 400 }
      )
    }

    const cleanEmail = email.trim().toLowerCase()
    const cleanName = fullName?.trim() || cleanEmail.split('@')[0]

    // 1. Check if user already exists in public.users
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle()

    let userId: string

    if (existingUser) {
      userId = existingUser.id
    } else {
      // 2. Ensure user exists in Supabase auth.users so foreign key constraint is satisfied
      const { data: authList } = await supabaseAdmin.auth.admin.listUsers()
      const authExisting = authList?.users?.find(
        (u) => u.email?.toLowerCase() === cleanEmail
      )

      if (authExisting) {
        userId = authExisting.id
      } else {
        const randomPassword = `GAuth_${crypto.randomBytes(16).toString('hex')}!1Aa`
        const { data: createdAuth, error: createError } =
          await supabaseAdmin.auth.admin.createUser({
            email: cleanEmail,
            email_confirm: true,
            password: randomPassword,
            user_metadata: {
              full_name: cleanName,
              provider: 'google',
              firebase_uid: uid || null,
              avatar_url: photoUrl || null,
            },
          })

        if (createError || !createdAuth?.user) {
          const { data: retryList } = await supabaseAdmin.auth.admin.listUsers()
          const retryFound = retryList?.users?.find(
            (u) => u.email?.toLowerCase() === cleanEmail
          )
          if (retryFound) {
            userId = retryFound.id
          } else {
            return NextResponse.json(
              {
                message: `Failed to provision Google user: ${
                  createError?.message || 'Unknown auth error'
                }`,
              },
              { status: 500 }
            )
          }
        } else {
          userId = createdAuth.user.id
        }
      }
    }

    // 3. Ensure profile and bank account exist in public.users and public.bank_accounts
    const profile = await ensureUserProfile(userId, cleanEmail, cleanName)

    // 4. Sign a session token
    const accessToken = signUserToken(
      profile.id,
      profile.email,
      profile.role || 'USER',
      86400 * 7
    )

    return NextResponse.json({
      accessToken,
      refreshToken: accessToken,
      tokenType: 'bearer',
      expiresIn: 86400 * 7,
      user: profile,
    })
  } catch (err: unknown) {
    console.error('[Google Auth API Error]:', err)
    const message = err instanceof Error ? err.message : 'Google authentication failed'
    return NextResponse.json({ message }, { status: 500 })
  }
}
