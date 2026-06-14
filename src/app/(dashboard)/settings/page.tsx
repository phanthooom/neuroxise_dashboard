'use client'

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-xl font-bold mb-6" style={{ color: 'var(--text)' }}>Settings</h1>

      <div className="max-w-xl space-y-4">
        <Section title="Doctor Profile">
          <Field label="Display Name" placeholder="Dr. Smith" />
          <Field label="Specialty" placeholder="Neurologist" />
          <Field label="Hospital / Clinic" placeholder="City Medical Center" />
        </Section>

        <Section title="Notifications">
          <Toggle label="Patient session alerts" defaultChecked />
          <Toggle label="Weekly summary report" defaultChecked />
          <Toggle label="Low accuracy alerts (< 60%)" />
        </Section>

        <Section title="Supabase Connection">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: '#1F8A5B' }} />
            <span className="text-sm" style={{ color: 'var(--text2)' }}>Connected to Supabase</span>
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--text3)' }}>Project: mshiwmqcfmvlrykkpklf.supabase.co</p>
        </Section>

        <button className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: 'var(--accent)' }}>
          Save Changes
        </button>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-5 rounded-2xl space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{title}</p>
      {children}
    </div>
  )
}

function Field({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text3)' }}>{label}</label>
      <input
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-xl text-sm outline-none"
        style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
      />
    </div>
  )
}

function Toggle({ label, defaultChecked }: { label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm" style={{ color: 'var(--text2)' }}>{label}</span>
      <div className="relative">
        <input type="checkbox" defaultChecked={defaultChecked} className="sr-only peer" />
        <div className="w-10 h-5 rounded-full peer-checked:opacity-100 opacity-40 transition-opacity"
          style={{ background: 'var(--accent)' }} />
        <div className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
      </div>
    </label>
  )
}
