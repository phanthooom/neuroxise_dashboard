import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
  process.exit(1)
}

// Note: We use the service role key to bypass RLS and create users via Admin API
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function seed() {
  console.log('🌱 Starting database seed...')

  // --- 1. Create a Doctor ---
  const doctorEmail = 'doctor@hospital.com'
  const doctorPassword = 'password123'
  
  console.log(`Creating doctor account (${doctorEmail})...`)
  const { data: doctorData, error: doctorError } = await supabaseAdmin.auth.admin.createUser({
    email: doctorEmail,
    password: doctorPassword,
    email_confirm: true,
    user_metadata: { name: 'Dr. Gregory House', role: 'doctor' }
  })

  if (doctorError) {
    if (doctorError.message.includes('already been registered')) {
        console.log('Doctor already exists. We will proceed by looking them up.')
    } else {
        console.error('Error creating doctor:', doctorError.message)
        process.exit(1)
    }
  }

  // Get doctor ID
  const { data: users } = await supabaseAdmin.auth.admin.listUsers()
  const doctor = users.users.find(u => u.email === doctorEmail)
  if (!doctor) throw new Error("Could not find doctor")

  console.log(`✅ Doctor created with ID: ${doctor.id}`)

  // --- 2. Create Patients ---
  const patientsInfo = [
    { email: 'patient1@neuroxise.com', name: 'Alice Cooper', type: 'semantic' },
    { email: 'patient2@neuroxise.com', name: 'Bob Dylan', type: 'sensory' },
    { email: 'patient3@neuroxise.com', name: 'Charlie Watts', type: 'opticMnestic' },
    { email: 'patient4@neuroxise.com', name: 'David Bowie', type: 'acousticMnestic' },
  ]

  const patientIds: string[] = []

  for (const p of patientsInfo) {
    console.log(`Creating patient: ${p.name}...`)
    const { data: patientData, error: patientError } = await supabaseAdmin.auth.admin.createUser({
      email: p.email,
      password: 'password123',
      email_confirm: true,
      user_metadata: { name: p.name, role: 'patient' }
    })

    let patientId = patientData?.user?.id
    
    if (patientError && patientError.message.includes('already been registered')) {
        const pUser = users.users.find(u => u.email === p.email)
        patientId = pUser?.id
    }

    if (patientId) {
        patientIds.push(patientId)
        
        // Link to doctor (Ignoring errors if link already exists)
        await supabaseAdmin.from('doctor_patients').insert({
            doctor_id: doctor.id,
            patient_id: patientId
        }).select().single()
        
        // Generate Mock Sessions for this patient
        await generateSessionsForPatient(patientId, p.type)
    }
  }

  console.log('✅ Patients created and linked to Doctor.')
  console.log('🎉 Seeding complete! You can now log in with doctor@hospital.com / password123')
}

// --- Helper: Generate Therapy Sessions ---
async function generateSessionsForPatient(patientId: string, aphasiaType: string) {
    console.log(`   Generating sessions for ${patientId}...`)
    
    const levels = ['easy', 'medium', 'hard']
    const sessions = []

    // Generate ~15 sessions for the last 30 days
    for (let i = 0; i < 15; i++) {
        const date = new Date()
        date.setDate(date.getDate() - Math.floor(Math.random() * 30)) // Random day within last 30 days
        
        const accuracy = Math.floor(Math.random() * 40) + 60 // 60-100%
        
        sessions.push({
            patient_id: patientId,
            aphasia_type: aphasiaType,
            level: levels[Math.floor(Math.random() * levels.length)],
            accuracy: accuracy,
            skill_score: Math.floor(accuracy * 1.5),
            avg_latency_sec: parseFloat((Math.random() * 5 + 2).toFixed(1)), // 2-7s
            hints_used: Math.floor(Math.random() * 3),
            exercises_count: 10,
            completed_at: date.toISOString(),
            answers: JSON.stringify([
                { q: 1, question: "Identify the object", correct: true, latency_sec: 2.5 },
                { q: 2, question: "Identify the object", correct: false, latency_sec: 4.1 }
            ])
        })
    }

    const { error } = await supabaseAdmin.from('therapy_sessions').insert(sessions)
    if (error) {
        console.error(`   Error generating sessions:`, error)
    }
}

seed().catch(console.error)
