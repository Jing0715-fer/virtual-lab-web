'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/virtual-lab')
  }, [router])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--vl-bg-primary)',
      color: 'var(--vl-text-primary)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: 'linear-gradient(135deg, #10b981, #06b6d4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          fontSize: 24,
          boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)',
          animation: 'pulse 2s ease-in-out infinite',
        }}>
          🔬
        </div>
        <p style={{ fontSize: 14, color: 'var(--vl-text-muted)' }}>
          Loading Virtual Lab...
        </p>
      </div>
    </div>
  )
}
