'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, Clock, Target, Lightbulb, X, CheckCircle, XCircle } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid,
} from 'recharts'
import { supabase, type Profile, type TherapySession, type AphasiaType, type Level } from '@/lib/supabase'
import { formatDate, formatDateTime } from '@/lib/tz'

const APHASIA_COLORS: Record<AphasiaType, string> = {
  semantic: '#1F8A5B',
  sensory: '#E5A84A',
  opticMnestic: '#9B59F5',
  acousticMnestic: '#3D52F5',
}
const APHASIA_LABELS: Record<AphasiaType, string> = {
  semantic: 'Semantic',
  sensory: 'Sensory',
  opticMnestic: 'Optic-mnestic',
  acousticMnestic: 'Acoustic-mnestic',
}
const LEVEL_LABELS: Record<Level, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
}

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color?: string
}) {
  return (
    <div className="p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color ?? 'var(--accent)'}22` }}>
          <Icon size={18} style={{ color: color ?? 'var(--accent)' }} />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text3)' }}>{label}</span>
      </div>
      <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: 'var(--text3)' }}>{sub}</p>}
    </div>
  )
}

function SessionModal({ session, onClose }: { session: TherapySession; onClose: () => void }) {
  const typeColor = APHASIA_COLORS[session.aphasia_type] ?? 'var(--accent)'
  const acc = Math.round(session.accuracy * 100)
  const accColor = acc >= 80 ? '#1F8A5B' : acc >= 60 ? '#E5A84A' : '#C53E3E'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-md rounded-2xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-5">
          <p className="font-semibold" style={{ color: 'var(--text)' }}>Session Details</p>
          <button onClick={onClose} style={{ color: 'var(--text3)' }}><X size={18} /></button>
        </div>

        {/* Date + badges */}
        <p className="text-xs mb-4" style={{ color: 'var(--text3)' }}>{formatDateTime(session.completed_at)}</p>
        <div className="flex gap-2 mb-5">
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{ background: `${typeColor}22`, color: typeColor }}>
            {APHASIA_LABELS[session.aphasia_type] ?? session.aphasia_type}
          </span>
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{ background: 'var(--bg)', color: 'var(--text2)', border: '1px solid var(--border)' }}>
            {LEVEL_LABELS[session.level as Level] ?? session.level}
          </span>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {[
            { label: 'Accuracy', value: `${acc}%`, color: accColor },
            { label: 'Skill Score', value: `${(session.skill_score * 100).toFixed(0)}%`, color: 'var(--accent)' },
            { label: 'Avg Response', value: `${session.avg_latency_sec.toFixed(1)}s`, color: '#E5A84A' },
            { label: 'Hints Used', value: String(session.hints_used), color: '#9B59F5' },
          ].map(({ label, value, color }) => (
            <div key={label} className="p-3.5 rounded-xl" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
              <p className="text-xs mb-1" style={{ color: 'var(--text3)' }}>{label}</p>
              <p className="text-xl font-bold" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Progress bar — accuracy */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1.5">
            <span style={{ color: 'var(--text3)' }}>Accuracy</span>
            <span style={{ color: accColor }}>{acc}%</span>
          </div>
          <div className="h-2 rounded-full" style={{ background: 'var(--bg)' }}>
            <div className="h-2 rounded-full transition-all" style={{ width: `${acc}%`, background: accColor }} />
          </div>
        </div>

        {/* Result indicator */}
        <div className="flex items-center gap-2 p-3 rounded-xl"
          style={{ background: acc >= 80 ? '#1F8A5B18' : acc >= 60 ? '#E5A84A18' : '#C53E3E18' }}>
          {acc >= 60
            ? <CheckCircle size={16} color={accColor} />
            : <XCircle size={16} color={accColor} />}
          <p className="text-xs font-medium" style={{ color: accColor }}>
            {acc >= 80 ? 'Excellent performance' : acc >= 60 ? 'Good progress' : 'Needs more practice'}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function PatientDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sessions, setSessions] = useState<TherapySession[]>([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<7 | 30 | 90 | 'all'>(30)
  const [selectedSession, setSelectedSession] = useState<TherapySession | null>(null)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    async function load() {
      const [{ data: profileData }, { data: sessionsData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).single(),
        supabase.from('therapy_sessions').select('*').eq('patient_id', id)
          .order('completed_at', { ascending: true }),
      ])
      setProfile(profileData)
      setSessions(sessionsData ?? [])
      setLoading(false)
    }
    load()

    const channel = supabase
      .channel(`patient-${id}-realtime`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'therapy_sessions', filter: `patient_id=eq.${id}` },
        (payload) => { setSessions(prev => [...prev, payload.new as TherapySession]) }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)' }} />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p style={{ color: 'var(--text2)' }}>Patient not found.</p>
        <Link href="/patients" className="text-sm" style={{ color: 'var(--accent)' }}>Back to patients</Link>
      </div>
    )
  }

  // Filter sessions by range
  const filtered = range === 'all' ? sessions : (() => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - range)
    return sessions.filter(s => new Date(s.completed_at) > cutoff)
  })()

  // Chart data
  const accuracyChartData = filtered.map(s => ({
    date: formatDate(s.completed_at),
    accuracy: Math.round(s.accuracy * 100),
    latency: +s.avg_latency_sec.toFixed(1),
  }))

  const typeBreakdown = Object.entries(
    filtered.reduce((acc, s) => {
      acc[s.aphasia_type] = (acc[s.aphasia_type] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)
  ).map(([type, count]) => ({ type: APHASIA_LABELS[type as AphasiaType] ?? type, count }))

  const totalSessions = filtered.length
  const avgAccuracy = totalSessions > 0
    ? filtered.reduce((s, sess) => s + sess.accuracy, 0) / totalSessions * 100
    : 0
  const avgLatency = totalSessions > 0
    ? filtered.reduce((s, sess) => s + sess.avg_latency_sec, 0) / totalSessions
    : 0
  const totalHints = filtered.reduce((s, sess) => s + sess.hints_used, 0)

  const initials = (profile.name ?? 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const dominantType = typeBreakdown.sort((a, b) => b.count - a.count)[0]

  const reversedSessions = [...filtered].reverse()
  const displayedSessions = showAll ? reversedSessions : reversedSessions.slice(0, 8)

  return (
    <div className="pb-8">
      {selectedSession && (
        <SessionModal session={selectedSession} onClose={() => setSelectedSession(null)} />
      )}

      {/* Back + header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/patients" className="flex items-center gap-1.5 text-sm hover:opacity-80" style={{ color: 'var(--text2)' }}>
          <ArrowLeft size={16} />
          Patients
        </Link>
      </div>

      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white"
            style={{ background: 'var(--accent)' }}>
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>{profile.name ?? 'Unknown'}</h1>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#1F8A5B' }} />
                <span className="text-xs font-semibold" style={{ color: '#1F8A5B' }}>Live</span>
              </div>
            </div>
            <p className="text-sm" style={{ color: 'var(--text3)' }}>
              Patient · ID {id.slice(0, 8).toUpperCase()}
              {dominantType && (
                <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold"
                  style={{ background: `${APHASIA_COLORS[dominantType.type.toLowerCase().replace(/-/g, '') as AphasiaType] ?? 'var(--accent)'}22`, color: 'var(--text2)' }}>
                  {dominantType.type}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Period switcher */}
        <div className="flex gap-1.5">
          {(['7', '30', '90', 'all'] as const).map(r => (
            <button key={r}
              onClick={() => setRange(r === 'all' ? 'all' : Number(r) as 7 | 30 | 90)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={{
                background: range === (r === 'all' ? 'all' : Number(r)) ? 'var(--accent)' : 'var(--surface)',
                color: range === (r === 'all' ? 'all' : Number(r)) ? 'white' : 'var(--text2)',
                border: '1px solid var(--border)',
              }}>
              {r === 'all' ? 'All' : `${r}d`}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Target} label="Avg Accuracy" value={`${avgAccuracy.toFixed(0)}%`}
          sub={range === 'all' ? 'All time' : `Last ${range} days`} color="#1F8A5B" />
        <StatCard icon={TrendingUp} label="Sessions" value={String(totalSessions)}
          sub={range === 'all' ? 'All time' : `Last ${range} days`} color="var(--accent)" />
        <StatCard icon={Clock} label="Avg Response" value={`${avgLatency.toFixed(1)}s`}
          sub="Per question" color="#E5A84A" />
        <StatCard icon={Lightbulb} label="Hints Used" value={String(totalHints)}
          sub={range === 'all' ? 'All time' : `Last ${range} days`} color="#9B59F5" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <div className="p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>Accuracy Trend</p>
          {accuracyChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={accuracyChartData}>
                <XAxis dataKey="date" tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip contentStyle={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8 }}
                  labelStyle={{ color: 'var(--text2)' }} itemStyle={{ color: '#1F8A5B' }} />
                <Line type="monotone" dataKey="accuracy" stroke="#1F8A5B" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </div>

        <div className="p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>Sessions by Aphasia Type</p>
          {typeBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={typeBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="type" tick={{ fill: 'var(--text3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8 }} />
                <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </div>
      </div>

      {/* Sessions table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            Sessions
            <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text3)' }}>
              ({totalSessions} total)
            </span>
          </p>
          <p className="text-xs" style={{ color: 'var(--text3)' }}>Click row for details</p>
        </div>
        {displayedSessions.length === 0 ? (
          <p className="text-sm text-center py-12" style={{ color: 'var(--text3)' }}>No sessions in this period</p>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Date', 'Aphasia Type', 'Level', 'Accuracy', 'Latency', 'Hints'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                      style={{ color: 'var(--text3)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayedSessions.map(s => {
                  const typeColor = APHASIA_COLORS[s.aphasia_type as AphasiaType] ?? 'var(--accent)'
                  const acc = Math.round(s.accuracy * 100)
                  const accColor = acc >= 80 ? '#1F8A5B' : acc >= 60 ? '#E5A84A' : '#C53E3E'
                  return (
                    <tr key={s.id}
                      onClick={() => setSelectedSession(s)}
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="px-5 py-3.5" style={{ color: 'var(--text2)' }}>
                        {formatDate(s.completed_at)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ background: `${typeColor}22`, color: typeColor }}>
                          {APHASIA_LABELS[s.aphasia_type as AphasiaType] ?? s.aphasia_type}
                        </span>
                      </td>
                      <td className="px-5 py-3.5" style={{ color: 'var(--text2)' }}>
                        {LEVEL_LABELS[s.level as Level] ?? s.level}
                      </td>
                      <td className="px-5 py-3.5 font-semibold" style={{ color: accColor }}>{acc}%</td>
                      <td className="px-5 py-3.5" style={{ color: 'var(--text2)' }}>{s.avg_latency_sec.toFixed(1)}s</td>
                      <td className="px-5 py-3.5" style={{ color: 'var(--text2)' }}>{s.hints_used}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {reversedSessions.length > 8 && (
              <div className="px-5 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <button onClick={() => setShowAll(v => !v)}
                  className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                  {showAll ? 'Show less' : `Show all ${reversedSessions.length} sessions`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Empty() {
  return <p className="text-sm text-center py-16" style={{ color: 'var(--text3)' }}>No data for this period</p>
}
