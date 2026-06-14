'use client'
import { useEffect, useState } from 'react'
import { Search, Plus, MoreVertical, X } from 'lucide-react'
import { supabase, type Profile, type TherapySession, type AphasiaType } from '@/lib/supabase'
import { formatRelative } from '@/lib/tz'
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
  const [filterType, setFilterType] = useState<AphasiaType | 'all'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'accuracy' | 'lastSession'>('lastSession')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [showModal, setShowModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState(false)

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteLoading(true)
    setInviteError(null)
    const res = await fetch('/api/invite-patient', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, name: inviteName }),
    })
    const data = await res.json()
    setInviteLoading(false)
    if (!res.ok) { setInviteError(data.error); return }
    setInviteSuccess(true)
    setTimeout(() => { setShowModal(false); setInviteSuccess(false); setInviteEmail(''); setInviteName('') }, 2000)
  }

  useEffect(() => {
    async function load() {
      // Get all profiles that are patients
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'patient')

      if (!profiles) { setLoading(false); return }

      // Single query for ALL patient sessions (fixes N+1)
      const { data: allSessions } = await supabase
        .from('therapy_sessions')
        .select('*')
        .in('patient_id', profiles.map(p => p.id))
        .order('completed_at', { ascending: false })

      const sessionsByPatient: Record<string, TherapySession[]> = {}
      allSessions?.forEach(s => {
        if (!sessionsByPatient[s.patient_id]) sessionsByPatient[s.patient_id] = []
        sessionsByPatient[s.patient_id].push(s)
      })

      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const results: PatientWithStats[] = profiles.map((profile) => {
        const sessions = sessionsByPatient[profile.id] ?? []
        const lastSession = sessions[0] ?? null
        const recent = sessions.filter(s => new Date(s.completed_at) > thirtyDaysAgo)
        const accuracy30d = recent.length > 0
          ? recent.reduce((sum, s) => sum + s.accuracy, 0) / recent.length * 100
          : null

        const typeCounts: Record<string, number> = {}
        sessions.forEach(s => { typeCounts[s.aphasia_type] = (typeCounts[s.aphasia_type] ?? 0) + 1 })
        const dominantType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as AphasiaType ?? null

        return { profile, lastSession, accuracy30d, dominantType }
      })

      setPatients(results)
      setLoading(false)
    }
    load()
  }, [])

  function toggleSort(field: typeof sortBy) {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(field); setSortDir('desc') }
  }

  const filtered = patients
    .filter(p => {
      const matchesSearch = (p.profile.name ?? '').toLowerCase().includes(search.toLowerCase())
      const matchesType = filterType === 'all' || p.dominantType === filterType
      return matchesSearch && matchesType
    })
    .sort((a, b) => {
      let cmp = 0
      if (sortBy === 'name') {
        cmp = (a.profile.name ?? '').localeCompare(b.profile.name ?? '')
      } else if (sortBy === 'accuracy') {
        cmp = (a.accuracy30d ?? -1) - (b.accuracy30d ?? -1)
      } else {
        const da = a.lastSession ? new Date(a.lastSession.completed_at).getTime() : 0
        const db = b.lastSession ? new Date(b.lastSession.completed_at).getTime() : 0
        cmp = da - db
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

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

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
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
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white ml-4"
          style={{ background: 'var(--accent)' }}>
          <Plus size={16} />
          Add Patient
        </button>
      </div>

      {/* Invite modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-5">
              <p className="font-semibold" style={{ color: 'var(--text)' }}>Invite Patient</p>
              <button onClick={() => setShowModal(false)} style={{ color: 'var(--text3)' }}><X size={18} /></button>
            </div>
            {inviteSuccess ? (
              <div className="text-center py-6">
                <p className="text-2xl mb-2">✓</p>
                <p className="text-sm" style={{ color: '#1F8A5B' }}>Invite sent! Patient will receive an email.</p>
              </div>
            ) : (
              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text3)' }}>Patient Name</label>
                  <input value={inviteName} onChange={e => setInviteName(e.target.value)}
                    placeholder="Full name" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text3)' }}>Email *</label>
                  <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                    placeholder="patient@email.com" required className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                </div>
                {inviteError && <p className="text-xs px-3 py-2 rounded-xl" style={{ background: '#C53E3E22', color: '#C53E3E' }}>{inviteError}</p>}
                <button type="submit" disabled={inviteLoading}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                  style={{ background: 'var(--accent)' }}>
                  {inviteLoading ? 'Sending...' : 'Send Invite'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Sort controls */}
      <div className="flex gap-2 mb-4 items-center">
        <span className="text-xs font-semibold" style={{ color: 'var(--text3)' }}>Sort:</span>
        {([['lastSession', 'Last Session'], ['accuracy', 'Accuracy'], ['name', 'Name']] as const).map(([field, label]) => {
          const active = sortBy === field
          return (
            <button key={field} onClick={() => toggleSort(field)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={{
                background: active ? 'var(--surface)' : 'transparent',
                color: active ? 'var(--text)' : 'var(--text3)',
                border: `1px solid ${active ? 'var(--border)' : 'transparent'}`,
              }}>
              {label}
              {active && <span style={{ color: 'var(--accent)' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>}
            </button>
          )
        })}
      </div>

      {/* Aphasia type filter */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {(['all', 'semantic', 'sensory', 'opticMnestic', 'acousticMnestic'] as const).map(type => {
          const active = filterType === type
          const color = type === 'all' ? 'var(--accent)' : APHASIA_COLORS[type]
          const count = type === 'all'
            ? patients.length
            : patients.filter(p => p.dominantType === type).length
          return (
            <button key={type} onClick={() => setFilterType(type)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{
                background: active ? color : `${color}18`,
                color: active ? 'white' : color,
                border: `1px solid ${active ? color : `${color}40`}`,
              }}>
              {type === 'all' ? 'All' : APHASIA_LABELS[type]} ({count})
            </button>
          )
        })}
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
                    <span style={{ color: 'var(--text2)' }}>{formatRelative(lastSession?.completed_at)}</span>
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
