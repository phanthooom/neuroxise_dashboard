'use client'
import { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, PieChart, Pie, Cell, Legend
} from 'recharts'
import { supabase, type TherapySession, type AphasiaType } from '@/lib/supabase'

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

export default function AnalyticsPage() {
  const [sessions, setSessions] = useState<TherapySession[]>([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<7 | 30 | 90>(30)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('therapy_sessions')
        .select('*')
        .order('completed_at', { ascending: true })
      setSessions(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - range)
  const filtered = sessions.filter(s => new Date(s.completed_at) > cutoff)

  // Daily accuracy trend
  const dailyMap: Record<string, { total: number; count: number }> = {}
  filtered.forEach(s => {
    const d = new Date(s.completed_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })
    if (!dailyMap[d]) dailyMap[d] = { total: 0, count: 0 }
    dailyMap[d].total += s.accuracy * 100
    dailyMap[d].count++
  })
  const dailyData = Object.entries(dailyMap).map(([date, { total, count }]) => ({
    date,
    accuracy: Math.round(total / count),
  }))

  // Aphasia type distribution
  const typeMap: Record<string, number> = {}
  filtered.forEach(s => { typeMap[s.aphasia_type] = (typeMap[s.aphasia_type] ?? 0) + 1 })
  const pieData = Object.entries(typeMap).map(([type, value]) => ({
    name: APHASIA_LABELS[type as AphasiaType] ?? type,
    value,
    color: APHASIA_COLORS[type as AphasiaType] ?? '#3D52F5',
  }))

  // Level breakdown
  const levelMap: Record<string, { total: number; count: number }> = {}
  filtered.forEach(s => {
    if (!levelMap[s.level]) levelMap[s.level] = { total: 0, count: 0 }
    levelMap[s.level].total += s.accuracy * 100
    levelMap[s.level].count++
  })
  const levelData = Object.entries(levelMap).map(([level, { total, count }]) => ({
    level: level.charAt(0).toUpperCase() + level.slice(1),
    accuracy: Math.round(total / count),
  }))

  // Summary stats
  const totalSessions = filtered.length
  const avgAcc = totalSessions > 0 ? filtered.reduce((s, sess) => s + sess.accuracy * 100, 0) / totalSessions : 0
  const avgLatency = totalSessions > 0 ? filtered.reduce((s, sess) => s + sess.avg_latency_sec, 0) / totalSessions : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)' }} />
      </div>
    )
  }

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Analytics</h1>
        <div className="flex gap-2">
          {([7, 30, 90] as const).map(r => (
            <button key={r} onClick={() => setRange(r)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: range === r ? 'var(--accent)' : 'var(--surface)',
                color: range === r ? 'white' : 'var(--text2)',
                border: '1px solid var(--border)',
              }}>
              {r}d
            </button>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Sessions', value: totalSessions },
          { label: 'Avg Accuracy', value: `${avgAcc.toFixed(0)}%` },
          { label: 'Avg Latency', value: `${avgLatency.toFixed(1)}s` },
        ].map(({ label, value }) => (
          <div key={label} className="p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text3)' }}>{label}</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--text)' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Accuracy trend */}
        <div className="p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>Accuracy Trend</p>
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={dailyData}>
                <XAxis dataKey="date" tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip contentStyle={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8 }}
                  labelStyle={{ color: 'var(--text2)' }} itemStyle={{ color: '#1F8A5B' }} />
                <Line type="monotone" dataKey="accuracy" stroke="#1F8A5B" strokeWidth={2} dot={{ r: 3, fill: '#1F8A5B' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>

        {/* Aphasia type pie */}
        <div className="p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>Sessions by Aphasia Type</p>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>
      </div>

      {/* Accuracy by level */}
      <div className="p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>Avg Accuracy by Difficulty Level</p>
        {levelData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={levelData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="level" tick={{ fill: 'var(--text3)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip contentStyle={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8 }} />
              <Bar dataKey="accuracy" fill="var(--accent)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <EmptyChart />}
      </div>
    </div>
  )
}

function EmptyChart() {
  return <p className="text-sm text-center py-16" style={{ color: 'var(--text3)' }}>No data for this period</p>
}
