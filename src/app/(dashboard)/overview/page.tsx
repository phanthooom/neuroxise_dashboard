'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, Target, TrendingUp, Activity, ArrowRight } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase, type Profile, type TherapySession, type AphasiaType } from '@/lib/supabase'
import { formatRelative } from '@/lib/tz'

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

interface Stats {
  totalPatients: number
  totalSessions: number
  avgAccuracy30d: number
  activeThisWeek: number
}

export default function OverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [trendData, setTrendData] = useState<{ date: string; accuracy: number }[]>([])
  const [recentSessions, setRecentSessions] = useState<(TherapySession & { patientName?: string })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const thirtyAgo = new Date(); thirtyAgo.setDate(thirtyAgo.getDate() - 30)
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)

      const { data: sessions } = await supabase
        .from('therapy_sessions')
        .select('*')
        .order('completed_at', { ascending: true })

      const allSessions: TherapySession[] = sessions ?? []

      // Get profiles for all unique patient IDs (no role filter — catches users with null name too)
      const patientIds = [...new Set(allSessions.map(s => s.patient_id))]
      const { data: profiles } = patientIds.length > 0
        ? await supabase.from('profiles').select('id, name').in('id', patientIds)
        : { data: [] }

      const allProfiles: Pick<Profile, 'id' | 'name'>[] = profiles ?? []
      const profileMap = Object.fromEntries(
        allProfiles.map(p => [p.id, p.name || `Patient ${p.id.slice(0, 6).toUpperCase()}`])
      )

      const recent30 = allSessions.filter(s => new Date(s.completed_at) > thirtyAgo)
      const avgAcc30 = recent30.length > 0
        ? recent30.reduce((s, x) => s + x.accuracy * 100, 0) / recent30.length
        : 0

      const activeIds = new Set(
        allSessions.filter(s => new Date(s.completed_at) > weekAgo).map(s => s.patient_id)
      )

      // Daily accuracy trend (last 30d)
      const dayMap: Record<string, { total: number; count: number }> = {}
      recent30.forEach(s => {
        const d = new Date(s.completed_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })
        if (!dayMap[d]) dayMap[d] = { total: 0, count: 0 }
        dayMap[d].total += s.accuracy * 100
        dayMap[d].count++
      })
      const trend = Object.entries(dayMap).map(([date, { total, count }]) => ({
        date,
        accuracy: Math.round(total / count),
      }))

      // Recent 10 sessions
      const last10 = [...allSessions].reverse().slice(0, 10).map(s => ({
        ...s,
        patientName: profileMap[s.patient_id] ?? `Patient ${s.patient_id.slice(0, 6).toUpperCase()}`,
      }))

      setStats({
        totalPatients: allProfiles.length,
        totalSessions: allSessions.length,
        avgAccuracy30d: avgAcc30,
        activeThisWeek: activeIds.size,
      })
      setTrendData(trend)
      setRecentSessions(last10)
      setLoading(false)
    }

    load()

    const channel = supabase
      .channel('overview-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'therapy_sessions' }, () => load())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--accent)' }} />
      </div>
    )
  }

  const statCards = [
    { icon: Users, label: 'Total Patients', value: String(stats?.totalPatients ?? 0), color: 'var(--accent)' },
    { icon: Activity, label: 'Active This Week', value: String(stats?.activeThisWeek ?? 0), color: '#1F8A5B' },
    { icon: Target, label: 'Avg Accuracy (30d)', value: `${(stats?.avgAccuracy30d ?? 0).toFixed(0)}%`, color: '#E5A84A' },
    { icon: TrendingUp, label: 'Total Sessions', value: String(stats?.totalSessions ?? 0), color: '#9B59F5' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Overview</h1>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#1F8A5B' }} />
            <span className="text-xs font-semibold" style={{ color: '#1F8A5B' }}>Live</span>
          </div>
        </div>
        <p className="text-sm" style={{ color: 'var(--text3)' }}>
          {new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}22` }}>
                <Icon size={18} style={{ color }} />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text3)' }}>{label}</span>
            </div>
            <p className="text-3xl font-bold" style={{ color: 'var(--text)' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Accuracy trend */}
      <div className="p-5 rounded-2xl mb-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>Clinic Accuracy Trend (Last 30 days)</p>
        {trendData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData}>
              <XAxis dataKey="date" tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip
                contentStyle={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8 }}
                labelStyle={{ color: 'var(--text2)' }}
                itemStyle={{ color: '#1F8A5B' }}
              />
              <Line type="monotone" dataKey="accuracy" stroke="#1F8A5B" strokeWidth={2}
                dot={{ r: 3, fill: '#1F8A5B' }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-center py-16" style={{ color: 'var(--text3)' }}>No session data yet</p>
        )}
      </div>

      {/* Recent sessions */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Recent Sessions</p>
          <Link href="/patients" className="flex items-center gap-1 text-xs font-semibold"
            style={{ color: 'var(--accent)' }}>
            All patients <ArrowRight size={13} />
          </Link>
        </div>
        {recentSessions.length === 0 ? (
          <p className="text-sm text-center py-12" style={{ color: 'var(--text3)' }}>No sessions yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Patient', 'Type', 'Accuracy', 'When'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                    style={{ color: 'var(--text3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentSessions.map(s => {
                const color = APHASIA_COLORS[s.aphasia_type] ?? 'var(--accent)'
                const acc = Math.round(s.accuracy * 100)
                const accColor = acc >= 80 ? '#1F8A5B' : acc >= 60 ? '#E5A84A' : '#C53E3E'
                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="px-5 py-3.5">
                      <Link href={`/patients/${s.patient_id}`}
                        className="font-medium hover:underline" style={{ color: 'var(--text)' }}>
                        {s.patientName}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{ background: `${color}22`, color }}>
                        {APHASIA_LABELS[s.aphasia_type] ?? s.aphasia_type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-semibold" style={{ color: accColor }}>{acc}%</td>
                    <td className="px-5 py-3.5" style={{ color: 'var(--text3)' }}>
                      {formatRelative(s.completed_at)}
                    </td>
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
