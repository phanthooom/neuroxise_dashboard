import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ name: null }, { status: 401 })

  const email = req.nextUrl.searchParams.get('email')
  if (!email) return NextResponse.json({ name: null })

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: { users } } = await adminSupabase.auth.admin.listUsers({ perPage: 1000 })
  const user = users.find(u => u.email === email)
  if (!user) return NextResponse.json({ name: null })

  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('name')
    .eq('id', user.id)
    .single()

  return NextResponse.json({ name: profile?.name ?? null })
}
