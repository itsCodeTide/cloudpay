import { NextRequest, NextResponse } from 'next/server'
import { getUserFromHeader, supabaseAdmin } from '@/frontend/lib/supabase-server'

function mapNotification(row: any) {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    type: row.type,
    read: Boolean(row.is_read),
    createdAt: row.created_at,
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromHeader(req)
    if (!user) return NextResponse.json({ message: 'Authentication required' }, { status: 401 })

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('id,title,message,type,is_read,created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) return NextResponse.json({ message: error.message }, { status: 500 })
    return NextResponse.json((data || []).map(mapNotification))
  } catch (err: unknown) {
    return NextResponse.json({ message: err instanceof Error ? err.message : 'Failed to load notifications' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getUserFromHeader(req)
    if (!user) return NextResponse.json({ message: 'Authentication required' }, { status: 401 })

    const id = new URL(req.url).searchParams.get('id')
    if (!id) return NextResponse.json({ message: 'Notification ID is required' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id,title,message,type,is_read,created_at')
      .maybeSingle()

    if (error) return NextResponse.json({ message: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ message: 'Notification not found' }, { status: 404 })
    return NextResponse.json(mapNotification(data))
  } catch (err: unknown) {
    return NextResponse.json({ message: err instanceof Error ? err.message : 'Failed to update notification' }, { status: 500 })
  }
}
