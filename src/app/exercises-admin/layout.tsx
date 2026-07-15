// src/app/exercises-admin/layout.tsx
'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getAdminToken, clearAdminToken } from '@/lib/backend-api'

export default function ExercisesAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const isLoginPage = pathname === '/exercises-admin/login'
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (isLoginPage) {
      setChecked(true)
      return
    }
    const token = getAdminToken()
    if (!token) {
      router.replace('/exercises-admin/login')
      return
    }
    setChecked(true)
  }, [isLoginPage, router])

  if (!checked) return null

  if (isLoginPage) return <>{children}</>

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/exercises-admin" className="text-lg font-semibold text-gray-900">
            Exercises Admin
          </Link>
          <button
            onClick={() => {
              clearAdminToken()
              router.push('/exercises-admin/login')
            }}
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            Chiqish
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  )
}