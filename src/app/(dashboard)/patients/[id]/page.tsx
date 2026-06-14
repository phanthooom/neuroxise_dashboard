'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, Clock, Target, Lightbulb } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, Legend
} from 'recharts'
import { supabase, type Profile, type TherapySession, type AphasiaType, type Level } from '@/lib/supabase'

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

export default function PatientDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sessions, setSessions] = useState<TherapySession[]>([])
  const [loading, setLoading] = useState(true)

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

  // Chart data: accuracy over time
  const accuracyChartData = sessions.map(s => ({
    date: new Date(s.completed_at).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    accuracy: Math.round(s.accuracy * 100),
    latency: +s.avg_latency_sec.toFixed(1),
  }))

  // Aphasia breakdown chart
  const typeBreakdown = Object.entries(
    sessions.reduce((acc, s) => {
      acc[s.aphasia_type] = (acc[s.aphasia_type] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)
  ).map(([type, count]) => ({ type: APHASIA_LABELS[type as AphasiaType] ?? type, count }))

  // Stats
  const totalSessions = sessions.length
  const avgAccuracy = totalSessions > 0
    ? sessions.reduce((s, sess) => s + sess.accuracy, 0) / totalSessions * 100
    : 0
  const avgLatency = totalSessions > 0
    ? sessions.reduce((s, sess) => s + sess.avg_latency_sec, 0) / totalSessions
    : 0
  const totalHints = sessions.reduce((s, sess) => s + sess.hints_used, 0)

  const initials = (profile.name ?? 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const dominantType = typeBreakdown.sort((a, b) => b.count - a.count)[0]

  const recentSessions = [...sessions].reverse().slice(0, 8)

  return (
    <div className="pb-8">
      {/* Back + header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/patients" className="flex items-center gap-1.5 text-sm hover:opacity-80" style={{ color: 'var(--text2)' }}>
          <ArrowLeft size={16} />
          Patients
        </Link>
      </div>

      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white"
          style={{ background: 'var(--accent)' }}>
          {initials}
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>{profile.name ?? 'Unknown'}</h1>
          <p className="text-sm" style={{ color: 'var(--text3)' }}>Patient · ID {id.slice(0, 8).toUpperCase()}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Target} label="Avg Accuracy" value={`${avgAccuracy.toFixed(0)}%`}
          sub="All sessions" color="#1F8A5B" />
        <StatCard icon={TrendingUp} label="Total Sessions" value={String(totalSessions)}
          sub="Completed exercises" color="var(--accent)" />
        <StatCard icon={Clock} label="Avg Response" value={`${avgLatency.toFixed(1)}s`}
          sub="Per exercise" color="#E5A84A" />
        <StatCard icon={Lightbulb} label="Hints Used" value={String(totalHints)}
          sub="Across all sessions" color="#9B59F5" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        {/* Accuracy trend */}
        <div className="p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>Accuracy Trend</p>
          {accuracyChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={accuracyChartData}>
                <XAxis dataKey="date" tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip
                  contentStyle={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8 }}
                  labelStyle={{ color: 'var(--text2)' }}
                  itemStyle={{ color: '#1F8A5B' }}
                />
                <Line type="monotone" dataKey="accuracy" stroke="#1F8A5B" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-center py-16" style={{ color: 'var(--text3)' }}>No session data yet</p>}
        </div>

        {/* Sessions by aphasia type */}
        <div className="p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>Sessions by Aphasia Type</p>
          {typeBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={typeBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="type" tick={{ fill: 'var(--text3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8 }}
                  labelStyle={{ color: 'var(--text2)' }}
                />
                <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-center py-16" style={{ color: 'var(--text3)' }}>No session data yet</p>}
        </div>
      </div>

      {/* Recent sessions table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Recent Sessions</p>
        </div>
        {recentSessions.length === 0 ? (
          <p className="text-sm text-center py-12" style={{ color: 'var(--text3)' }}>No sessions yet</p>
        ) : (
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
              {recentSessions.map(s => {
                const typeColor = APHASIA_COLORS[s.aphasia_type as AphasiaType] ?? 'var(--accent)'
                const acc = Math.round(s.accuracy * 100)
                const accColor = acc >= 80 ? '#1F8A5B' : acc >= 60 ? '#E5A84A' : '#C53E3E'
                return (
                  <tr key={s.id} className="hover:opacity-80 transition-opacity"
                    style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="px-5 py-3.5" style={{ color: 'var(--text2)' }}>
                      {new Date(s.completed_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: '2-digit' })}
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
        )}
      </div>
    </div>
  )
}
