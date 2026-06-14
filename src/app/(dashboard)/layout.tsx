import Sidebar from '@/components/Sidebar'
import { PageTransition } from '@/components/PageTransition'
import SplashScreen from '@/components/SplashScreen'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SplashScreen />
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6" style={{ background: 'var(--bg)' }}>
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </>
  )
}
