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

  // Check if user already exists
  const { data: { users } } = await adminSupabase.auth.admin.listUsers({ perPage: 1000 })
  const existingUser = users.find(u => u.email === email)

  let userId: string

  if (existingUser) {
    // User exists — just link to doctor
    userId = existingUser.id
    if (name) {
      await adminSupabase.from('profiles').update({ name }).eq('id', userId)
    }
  } else {
    // New user — send invite
    const { data, error } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
      data: { name: name ?? '' },
    })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    userId = data.user.id
    await adminSupabase.from('profiles').upsert({
      id: userId,
      name: name ?? email.split('@')[0],
      role: 'patient',
    })
  }

  // Link patient to the inviting doctor
  await adminSupabase.from('doctor_patients').upsert({
    doctor_id: session.user.id,
    patient_id: userId,
  }, { onConflict: 'doctor_id,patient_id' })

  return NextResponse.json({ success: true })
}
