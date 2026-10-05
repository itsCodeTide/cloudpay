import { NextRequest, NextResponse } from 'next/server'
import { getUserFromHeader, supabaseAdmin } from '@/frontend/lib/supabase-server'
import { cacheGet, cacheSet } from '@/frontend/lib/redis'

const CACHE_TTL = 30 // seconds — short TTL so balance feels live

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromHeader(req)
    if (!user) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 })
    }

    // Check Redis cache first (fast path — ~1ms vs ~500ms DB)
    const cacheKey = `dashboard:safe:${user.id}`
    const cached = await cacheGet<object>(cacheKey)
    if (cached) {
      const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached
      return NextResponse.json({ ...parsed, _cached: true })
    }

    const { count: totalTransactions } = await supabaseAdmin
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)

    const { count: unreadNotifications } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    const [{ data: sentTransactions }, { data: receivedTransactions }] = await Promise.all([
      supabaseAdmin.from('transactions').select('amount').eq('sender_id', user.id).eq('status', 'SUCCESS').gte('created_at', startOfMonth),
      supabaseAdmin.from('transactions').select('amount').eq('receiver_id', user.id).eq('status', 'SUCCESS').gte('created_at', startOfMonth),
    ])
    const monthlySpending = (sentTransactions || []).reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
    const monthlyIncome = (receivedTransactions || []).reduce((sum, tx) => sum + Number(tx.amount || 0), 0)

    const result = {
      availableBalance: null,
      monthlySpending,
      monthlyIncome,
      totalTransactions: totalTransactions || 0,
      unreadNotifications: unreadNotifications || 0,
    }

    // Cache result in Redis
    await cacheSet(cacheKey, result, CACHE_TTL)

    return NextResponse.json(result)
  } catch (err: unknown) {
    console.error('[Dashboard API Error]:', err)
    const message = err instanceof Error ? err.message : 'Failed to fetch dashboard'
    return NextResponse.json({ message }, { status: 500 })
  }
}
