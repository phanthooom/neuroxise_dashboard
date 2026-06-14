'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Users, BarChart2, Settings, LogOut } from 'lucide-react'
import Image from 'next/image'
import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const nav = [
  { href: '/overview', icon: Home, label: 'Overview', exact: true },
  { href: '/patients', icon: Users, label: 'Patients' },
  { href: '/analytics', icon: BarChart2, label: 'Analytics' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  const path = usePathname()
  const router = useRouter()
  const [doctorName, setDoctorName] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setEmail(user.email ?? null)
      supabase.from('profiles').select('name').eq('id', user.id).single()
        .then(({ data }) => setDoctorName(data?.name ?? null))
    })
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = doctorName
    ? doctorName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : email?.[0]?.toUpperCase() ?? 'D'

  return (
    <aside className="w-48 flex flex-col h-full" style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}>
      {/* Logo */}
      <div className="p-5 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0" style={{ background: '#000' }}>
            <Image src="/logo.jpg" alt="Neuroxise" width={32} height={32} className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: 'var(--text)' }}>Neuroxise</p>
            <p className="text-xs" style={{ color: 'var(--text3)' }}>Clinical Dashboard</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 flex flex-col gap-1">
        {nav.map(({ href, icon: Icon, label, exact }) => {
          const active = exact ? path === href : path.startsWith(href)
          return (
            <Link key={href} href={href} className={clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
              active ? 'text-white' : 'hover:opacity-80'
            )} style={{
              background: active ? 'var(--accent)' : 'transparent',
              color: active ? 'white' : 'var(--text2)',
            }}>
              <Icon size={18} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Doctor info + logout */}
      <div className="p-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: 'var(--accent2)' }}>
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: 'var(--text)' }}>
              {doctorName ?? 'Doctor'}
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--text3)' }}>
              {email ?? 'Neurologist'}
            </p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-medium hover:opacity-80 transition-opacity"
          style={{ color: 'var(--text3)', background: 'var(--bg)' }}>
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
