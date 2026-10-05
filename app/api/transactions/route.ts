import { NextRequest, NextResponse } from 'next/server'
import { getUserFromHeader, supabaseAdmin, mapTransaction } from '@/frontend/lib/supabase-server'

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromHeader(req)
    if (!user) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const page = Math.max(0, parseInt(searchParams.get('page') || '0', 10))
    const size = Math.max(1, Math.min(100, parseInt(searchParams.get('size') || '20', 10)))

    const from = page * size
    const to = from + size - 1

    const { data: rows, count, error } = await supabaseAdmin
      .from('transactions')
      .select('*', { count: 'exact' })
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      return NextResponse.json(
        { message: `Failed to fetch history: ${error.message}` },
        { status: 500 }
      )
    }

    const content = (rows || []).map(mapTransaction)
    const totalElements = count || 0
    const totalPages = Math.ceil(totalElements / size)

    return NextResponse.json({
      content,
      page,
      size,
      totalElements,
      totalPages,
    })
  } catch (err: unknown) {
    console.error('[Transactions History API Error]:', err)
    const message = err instanceof Error ? err.message : 'Failed to fetch transactions'
    return NextResponse.json({ message }, { status: 500 })
  }
}
