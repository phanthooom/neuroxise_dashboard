'use client'
import { useEffect, useState } from 'react'
import { Search, Plus, MoreVertical } from 'lucide-react'
import { supabase, type Profile, type TherapySession, type AphasiaType } from '@/lib/supabase'
import Link from 'next/link'

const APHASIA_COLORS: Record<AphasiaType, string> = {
  semantic: '#1F8A5B',
  sensory: '#E5A84A',
  opticMnestic: '#9B59F5',
  acousticMnestic: '#3D52F5',
}

const APHASIA_LABELS: Record<AphasiaType, string> = {
  semantic: 'Semantic',
  sensory: 'Sensory',
  opticMnestic: 'Optic',
  acousticMnestic: 'Acoustic',
}

interface PatientWithStats {
  profile: Profile
  lastSession: TherapySession | null
  accuracy30d: number | null
  dominantType: AphasiaType | null
}

function AccuracyBadge({ value }: { value: number | null }) {
  if (value === null) return <span style={{ color: 'var(--text3)' }} className="text-xs">No data</span>
  const color = value >= 80 ? '#1F8A5B' : value >= 60 ? '#E5A84A' : '#C53E3E'
  return (
    <div className="flex items-center gap-2 mt-2">
      <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--border)' }}>
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-xs font-bold" style={{ color }}>{value.toFixed(0)}%</span>
    </div>
  )
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<PatientWithStats[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      // Get all profiles that are patients
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'patient')

      if (!profiles) { setLoading(false); return }

      // For each patient, get their sessions
      const results: PatientWithStats[] = await Promise.all(
        profiles.map(async (profile) => {
          const thirtyDaysAgo = new Date()
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

          const { data: sessions } = await supabase
            .from('therapy_sessions')
            .select('*')
            .eq('patient_id', profile.id)
            .order('completed_at', { ascending: false })

          const lastSession = sessions?.[0] ?? null
          const recent = sessions?.filter(s => new Date(s.completed_at) > thirtyDaysAgo) ?? []
          const accuracy30d = recent.length > 0
            ? recent.reduce((sum, s) => sum + s.accuracy, 0) / recent.length * 100
            : null

          // Most frequent aphasia type
          const typeCounts: Record<string, number> = {}
          sessions?.forEach(s => { typeCounts[s.aphasia_type] = (typeCounts[s.aphasia_type] ?? 0) + 1 })
          const dominantType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as AphasiaType ?? null

          return { profile, lastSession, accuracy30d, dominantType }
        })
      )

      setPatients(results)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = patients.filter(p =>
    p.profile.name?.toLowerCase().includes(search.toLowerCase())
  )

  const avgAccuracy = patients.filter(p => p.accuracy30d !== null)
  const avg = avgAccuracy.length > 0
    ? avgAccuracy.reduce((s, p) => s + p.accuracy30d!, 0) / avgAccuracy.length
    : 0

  const activeThisWeek = patients.filter(p => {
    if (!p.lastSession) return false
    const d = new Date(p.lastSession.completed_at)
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
    return d > weekAgo
  }).length

  function formatDate(dateStr: string) {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = Math.floor((now.getTime() - d.getTime()) / 86400000)
    if (diff === 0) return 'Today'
    if (diff === 1) return 'Yesterday'
    return `${diff} days ago`
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1 relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text3)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search patients by name..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white ml-4" style={{ background: 'var(--accent)' }}>
          <Plus size={16} />
          Add Patient
        </button>
      </div>

      {/* Patient grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 rounded-2xl animate-pulse" style={{ background: 'var(--surface)' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <Users size={40} style={{ color: 'var(--text3)' }} />
          <p style={{ color: 'var(--text2)' }}>No patients yet. Add your first patient.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(({ profile, lastSession, accuracy30d, dominantType }) => {
            const initials = (profile.name ?? 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
            const color = dominantType ? APHASIA_COLORS[dominantType] : 'var(--accent)'
            return (
              <Link key={profile.id} href={`/patients/${profile.id}`}>
                <div className="p-5 rounded-2xl cursor-pointer hover:opacity-90 transition-opacity"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                        style={{ background: color }}>
                        {initials}
                      </div>
                      <div>
                        <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{profile.name ?? 'Unknown'}</p>
                        <p className="text-xs" style={{ color: 'var(--text3)' }}>ID: {profile.id.slice(0, 8).toUpperCase()}</p>
                      </div>
                    </div>
                    <button className="p-1 hover:opacity-60" style={{ color: 'var(--text3)' }}>
                      <MoreVertical size={16} />
                    </button>
                  </div>

                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: 'var(--text3)' }}>Last Session</span>
                    <span style={{ color: 'var(--text2)' }}>{lastSession ? formatDate(lastSession.completed_at) : '—'}</span>
                  </div>
                  <div className="flex justify-between text-xs mb-2">
                    <span style={{ color: 'var(--text3)' }}>Aphasia Type</span>
                    {dominantType ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{ background: `${color}22`, color }}>
                        {APHASIA_LABELS[dominantType]}
                      </span>
                    ) : <span style={{ color: 'var(--text3)' }}>—</span>}
                  </div>

                  <p className="text-xs mb-1" style={{ color: 'var(--text3)' }}>Accuracy (30d)</p>
                  <AccuracyBadge value={accuracy30d} />
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Stats bar */}
      <div className="fixed bottom-0 left-48 right-0 flex items-center gap-8 px-8 py-4"
        style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
        {[
          { label: 'TOTAL PATIENTS', value: patients.length },
          { label: 'ACTIVE THIS WEEK', value: activeThisWeek },
          { label: 'AVG ACCURACY', value: `${avg.toFixed(0)}%` },
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--text3)' }}>{label}</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function Users({ size, style }: { size: number; style?: React.CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={style}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
}
