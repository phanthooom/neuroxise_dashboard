// src/lib/backend-api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.neuroxise.com/api/v1'
const TOKEN_KEY = 'neuroxise_admin_token'

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setAdminToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearAdminToken() {
  localStorage.removeItem(TOKEN_KEY)
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAdminToken()
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (res.status === 401) {
    clearAdminToken()
    if (typeof window !== 'undefined') window.location.href = '/exercises-admin/login'
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `Xatolik: ${res.status}`)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

// ---------- Admin auth ----------

export interface AdminTokenResponse {
  access_token: string
  token_type: string
  role: string
  name: string | null
}

export async function adminLogin(email: string, password: string): Promise<AdminTokenResponse> {
  const res = await fetch(`${API_BASE_URL}/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || 'Login yoki parol notoʻgʻri')
  }
  return res.json()
}

// ---------- Exercises (admin CRUD) ----------

export type Locale = 'uz' | 'ru' | 'en'

export interface OptionTranslation {
  locale: Locale
  text: string
}

export interface OptionIn {
  option_key: string
  image_asset: string | null
  sort_order: number
  translations: OptionTranslation[]
}

export interface ExerciseTranslation {
  locale: Locale
  title: string
  goal: string
  instruction: string
  question: string
}

export interface ExerciseAdmin {
  id: string
  aphasia_type: string
  level: string
  task_type: string
  order: number
  correct_answer_ids: string[]
  image_asset: string | null
  audio_asset: string | null
  target_latency_sec: number
  max_latency_sec: number
  max_hints: number
  is_published: boolean
  translations: ExerciseTranslation[]
  options: OptionIn[]
}

export type ExerciseCreatePayload = ExerciseAdmin
export type ExerciseUpdatePayload = Partial<Omit<ExerciseAdmin, 'id'>>

export const listExercises = () => request<ExerciseAdmin[]>('/admin/exercises')
export const getExercise = (id: string) => request<ExerciseAdmin>(`/admin/exercises/${id}`)
export const createExercise = (payload: ExerciseCreatePayload) =>
  request<ExerciseAdmin>('/admin/exercises', { method: 'POST', body: JSON.stringify(payload) })
export const updateExercise = (id: string, payload: ExerciseUpdatePayload) =>
  request<ExerciseAdmin>(`/admin/exercises/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
export const deleteExercise = (id: string) =>
  request<void>(`/admin/exercises/${id}`, { method: 'DELETE' })

// ---------- Media upload ----------

export async function uploadMedia(file: File): Promise<string> {
  const token = getAdminToken()
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${API_BASE_URL}/admin/media/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || 'Fayl yuklashda xatolik')
  }
  const data = await res.json()
  return data.url as string
}

export const APHASIA_TYPES = ['semantic', 'sensory', 'opticMnestic', 'acousticMnestic'] as const
export const LEVELS = ['easy', 'medium', 'hard'] as const
export const TASK_TYPES = [
  'singleChoice', 'imageChoice', 'matching', 'dragAndDrop', 'memorySequence',
  'audioImageCheck', 'textInput', 'categorySelection', 'voiceInput',
] as const
export const LOCALES: Locale[] = ['uz', 'ru', 'en']