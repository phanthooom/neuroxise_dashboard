'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, BarChart2, Settings, Brain } from 'lucide-react'
import clsx from 'clsx'

const nav = [
  { href: '/patients', icon: Users, label: 'Patients' },
  { href: '/analytics', icon: BarChart2, label: 'Analytics' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  const path = usePathname()
  return (
    <aside className="w-48 flex flex-col h-full" style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}>
      {/* Logo */}
      <div className="p-5 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--accent)' }}>
            <Brain size={16} color="white" />
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: 'var(--text)' }}>Neuroxise</p>
            <p className="text-xs" style={{ color: 'var(--text3)' }}>Clinical Dashboard</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 flex flex-col gap-1">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = path.startsWith(href)
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

      {/* Doctor info */}
      <div className="p-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: 'var(--accent2)' }}>
            Dr
          </div>
          <div>
            <p className="text-xs font-semibold" style={{ color: 'var(--text)' }}>Doctor</p>
            <p className="text-xs" style={{ color: 'var(--text3)' }}>Neurologist</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
