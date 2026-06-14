'use client'
import { useEffect, useState } from 'react'
import { User, Bell, Database, Lock, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'

function Section({ title, icon: Icon, children }: {
  title: string; icon: React.ElementType; children: React.ReactNode
}) {
  return (
    <div className="p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 mb-4 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <Icon size={16} style={{ color: 'var(--accent)' }} />
        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{title}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, readOnly, type = 'text' }: {
  label: string; value: string; onChange?: (v: string) => void
  placeholder?: string; readOnly?: boolean; type?: string
}) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text3)' }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
        style={{
          background: readOnly ? 'var(--bg)' : 'var(--bg)',
          border: '1px solid var(--border)',
          color: readOnly ? 'var(--text3)' : 'var(--text)',
          cursor: readOnly ? 'default' : 'text',
          opacity: readOnly ? 0.7 : 1,
        }}
      />
    </div>
  )
}

function Toast({ type, message }: { type: 'success' | 'error'; message: string }) {
  return (
    <div className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium z-50"
      style={{
        background: type === 'success' ? '#1F8A5B18' : '#C53E3E18',
        border: `1px solid ${type === 'success' ? '#1F8A5B' : '#C53E3E'}`,
        color: type === 'success' ? '#1F8A5B' : '#C53E3E',
      }}>
      {type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
      {message}
    </div>
  )
}

export default function SettingsPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [userId, setUserId] = useState('')
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileSaving, setProfileSaving] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      setEmail(user.email ?? '')
      const { data } = await supabase.from('profiles').select('name').eq('id', user.id).single()
      setName(data?.name ?? '')
      setProfileLoading(false)
    }
    load()
  }, [])

  async function saveProfile() {
    if (!userId || !name.trim()) return
    setProfileSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ name: name.trim() })
      .eq('id', userId)
    setProfileSaving(false)
    if (error) showToast('error', 'Failed to save: ' + error.message)
    else showToast('success', 'Profile saved')
  }

  async function changePassword() {
    if (!newPassword || newPassword !== confirmPassword) {
      showToast('error', 'Passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      showToast('error', 'Password must be at least 6 characters')
      return
    }
    setPasswordSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordSaving(false)
    if (error) showToast('error', error.message)
    else {
      showToast('success', 'Password changed')
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    }
  }

  return (
    <div>
      {toast && <Toast type={toast.type} message={toast.message} />}

      <h1 className="text-xl font-bold mb-6" style={{ color: 'var(--text)' }}>Settings</h1>

      <div className="max-w-xl space-y-4">

        {/* Doctor profile */}
        <Section title="Doctor Profile" icon={User}>
          {profileLoading ? (
            <div className="h-20 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: 'var(--accent)' }} />
            </div>
          ) : (
            <>
              <Field label="Display Name" value={name} onChange={setName} placeholder="Dr. Smith" />
              <Field label="Email" value={email} readOnly />
              <div className="flex items-center gap-2 pt-1">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#1F8A5B' }} />
                <span className="text-xs" style={{ color: 'var(--text3)' }}>Role: Doctor</span>
              </div>
              <button
                onClick={saveProfile}
                disabled={profileSaving || !name.trim()}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
                style={{ background: 'var(--accent)' }}>
                {profileSaving ? 'Saving...' : 'Save Profile'}
              </button>
            </>
          )}
        </Section>

        {/* Change password */}
        <Section title="Change Password" icon={Lock}>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text3)' }}>
              New Password
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="w-full px-3 py-2.5 pr-10 rounded-xl text-sm outline-none"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
              />
              <button onClick={() => setShowNew(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text3)' }}>
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text3)' }}>
              Confirm New Password
            </label>
            <input
              type={showNew ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repeat password"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{
                background: 'var(--bg)',
                border: `1px solid ${confirmPassword && confirmPassword !== newPassword ? '#C53E3E' : 'var(--border)'}`,
                color: 'var(--text)',
              }}
            />
            {confirmPassword && confirmPassword !== newPassword && (
              <p className="text-xs mt-1" style={{ color: '#C53E3E' }}>Passwords do not match</p>
            )}
          </div>
          <button
            onClick={changePassword}
            disabled={passwordSaving || !newPassword || newPassword !== confirmPassword}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
            style={{ background: '#C53E3E' }}>
            {passwordSaving ? 'Changing...' : 'Change Password'}
          </button>
        </Section>

        {/* Supabase info */}
        <Section title="Database Connection" icon={Database}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#1F8A5B' }} />
            <span className="text-sm" style={{ color: 'var(--text2)' }}>Connected to Supabase</span>
          </div>
          <p className="text-xs" style={{ color: 'var(--text3)' }}>
            Project: mshiwmqcfmvlrykkpklf.supabase.co
          </p>
          {userId && (
            <p className="text-xs font-mono" style={{ color: 'var(--text3)' }}>
              User ID: {userId.slice(0, 8).toUpperCase()}...
            </p>
          )}
        </Section>

      </div>
    </div>
  )
}
