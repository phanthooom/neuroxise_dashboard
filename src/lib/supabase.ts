import { createBrowserClient } from '@supabase/ssr'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createBrowserClient(url, key)

export type AphasiaType = 'semantic' | 'sensory' | 'opticMnestic' | 'acousticMnestic'
export type Level = 'easy' | 'medium' | 'hard'

export interface Profile {
  id: string
  name: string
  role: 'patient' | 'doctor'
  created_at: string
}

export interface TherapySession {
  id: string
  patient_id: string
  aphasia_type: AphasiaType
  level: Level
  accuracy: number
  skill_score: number
  avg_latency_sec: number
  hints_used: number
  exercises_count: number
  completed_at: string
}

export interface DoctorPatient {
  id: string
  doctor_id: string
  patient_id: string
  assigned_at: string
}
