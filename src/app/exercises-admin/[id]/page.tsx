// src/app/exercises-admin/[id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ExerciseForm from '@/components/ExerciseForm'
import { getExercise, updateExercise, ExerciseAdmin } from '@/lib/backend-api'

export default function EditExercisePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [exercise, setExercise] = useState<ExerciseAdmin | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getExercise(params.id)
      .then(setExercise)
      .catch((err) => setError(err instanceof Error ? err.message : 'Xatolik'))
  }, [params.id])

  async function handleSubmit(data: ExerciseAdmin) {
    await updateExercise(params.id, data)
    router.push('/exercises-admin')
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (!exercise) return <p className="text-sm text-gray-500">Yuklanmoqda...</p>

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Tahrirlash: {exercise.id}</h1>
      <ExerciseForm initial={exercise} onSubmit={handleSubmit} submitLabel="Saqlash" />
    </div>
  )
}