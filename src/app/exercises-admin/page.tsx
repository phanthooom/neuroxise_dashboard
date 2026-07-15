// src/app/exercises-admin/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { listExercises, deleteExercise, ExerciseAdmin } from '@/lib/backend-api'

const APHASIA_LABELS: Record<string, string> = {
  semantic: 'Semantik',
  sensory: 'Sensor',
  opticMnestic: 'Optik-mnestik',
  acousticMnestic: 'Akustik-mnestik',
}

const LEVEL_LABELS: Record<string, string> = {
  easy: 'Oson',
  medium: "O'rta",
  hard: 'Qiyin',
}

export default function ExercisesListPage() {
  const [exercises, setExercises] = useState<ExerciseAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterLevel, setFilterLevel] = useState<string>('all')
  const [search, setSearch] = useState('')

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await listExercises()
      setExercises(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xatolik yuz berdi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    return exercises.filter((e) => {
      if (filterType !== 'all' && e.aphasia_type !== filterType) return false
      if (filterLevel !== 'all' && e.level !== filterLevel) return false
      if (search) {
        const title = e.translations.find((t) => t.locale === 'uz')?.title || ''
        if (!title.toLowerCase().includes(search.toLowerCase()) && !e.id.includes(search)) {
          return false
        }
      }
      return true
    })
  }, [exercises, filterType, filterLevel, search])

  async function handleDelete(id: string) {
    if (!confirm(`O'chirishni tasdiqlaysizmi? (${id})`)) return
    try {
      await deleteExercise(id)
      setExercises((prev) => prev.filter((e) => e.id !== id))
    } catch (err) {
      alert(err instanceof Error ? err.message : "O'chirishda xatolik")
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Mashqlar ({exercises.length})</h1>
        <Link
          href="/exercises-admin/new"
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          + Yangi mashq
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          placeholder="Qidirish (nomi yoki ID)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none"
        >
          <option value="all">Barcha turlar</option>
          {Object.entries(APHASIA_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none"
        >
          <option value="all">Barcha darajalar</option>
          {Object.entries(LEVEL_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {loading && <p className="text-sm text-gray-500">Yuklanmoqda...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Nomi (UZ)</th>
                <th className="px-4 py-3 font-medium">Turi</th>
                <th className="px-4 py-3 font-medium">Daraja</th>
                <th className="px-4 py-3 font-medium">Tartib</th>
                <th className="px-4 py-3 font-medium">Holat</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((ex) => {
                const title = ex.translations.find((t) => t.locale === 'uz')?.title || '—'
                return (
                  <tr key={ex.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{ex.id}</td>
                    <td className="px-4 py-3 text-gray-900">{title}</td>
                    <td className="px-4 py-3 text-gray-600">{APHASIA_LABELS[ex.aphasia_type] || ex.aphasia_type}</td>
                    <td className="px-4 py-3 text-gray-600">{LEVEL_LABELS[ex.level] || ex.level}</td>
                    <td className="px-4 py-3 text-gray-600">{ex.order}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          ex.is_published
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {ex.is_published ? 'Chop etilgan' : 'Qoralama'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/exercises-admin/${ex.id}`}
                        className="mr-3 text-sm text-blue-600 hover:underline"
                      >
                        Tahrirlash
                      </Link>
                      <button
                        onClick={() => handleDelete(ex.id)}
                        className="text-sm text-red-600 hover:underline"
                      >
                        O'chirish
                      </button>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    Hech narsa topilmadi
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}