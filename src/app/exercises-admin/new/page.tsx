// src/app/exercises-admin/new/page.tsx
'use client'

import { useRouter } from 'next/navigation'
import ExerciseForm from '@/components/ExerciseForm'
import { createExercise, ExerciseAdmin } from '@/lib/backend-api'

export default function NewExercisePage() {
  const router = useRouter()

  async function handleSubmit(data: ExerciseAdmin) {
    await createExercise(data)
    router.push('/exercises-admin')
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Yangi mashq</h1>
      <ExerciseForm onSubmit={handleSubmit} submitLabel="Yaratish" />
    </div>
  )
}