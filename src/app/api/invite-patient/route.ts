import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  // Verify caller is authenticated
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { email, name } = await request.json()
  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 })
  }

  // Init admin client inside handler — env var available at runtime, not build time
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data, error } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
    data: { name: name ?? '' },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (data.user) {
    await adminSupabase.from('profiles').upsert({
      id: data.user.id,
      name: name ?? email.split('@')[0],
      role: 'patient',
    })

    // Link patient to the inviting doctor
    await adminSupabase.from('doctor_patients').upsert({
      doctor_id: session.user.id,
      patient_id: data.user.id,
    }, { onConflict: 'doctor_id,patient_id' })
  }

  return NextResponse.json({ success: true })
}
