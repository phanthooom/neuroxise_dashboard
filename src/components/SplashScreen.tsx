'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'

export default function SplashScreen() {
  const [visible, setVisible] = useState(true)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 1400)
    const hideTimer = setTimeout(() => setVisible(false), 1900)
    return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer) }
  }, [])

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6 transition-opacity duration-500"
      style={{
        background: '#000000',
        opacity: fading ? 0 : 1,
        pointerEvents: fading ? 'none' : 'all',
      }}
    >
      <div className="w-24 h-24 rounded-3xl overflow-hidden shadow-2xl">
        <Image src="/logo.jpg" alt="Neuroxise" width={96} height={96} className="w-full h-full object-cover" priority />
      </div>
      <div className="text-center">
        <p className="text-2xl font-bold text-white tracking-tight">Neuroxise</p>
        <p className="text-sm mt-1" style={{ color: '#888' }}>Clinical Dashboard</p>
      </div>
      <div className="flex gap-1.5 mt-4">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: '#3D52F5',
              animation: `pulse 1s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  )
}
