import Sidebar from '@/components/Sidebar'
import { PageTransition } from '@/components/PageTransition'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6" style={{ background: 'var(--bg)' }}>
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  )
}
