'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'

const VirtualLabShell = dynamic(() => import('./shell').catch(err => {
  console.error('[VirtualLab] Failed to load shell:', err)
  return { default: () => <div style={{ padding: 40, color: 'red' }}>Failed to load: {String(err)}</div> }
}), {
  ssr: false,
  loading: () => (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0f172a',
      color: '#e2e8f0',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: 'linear-gradient(135deg, #10b981, #06b6d4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px', fontSize: 24,
          boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)',
        }}>
          🔬
        </div>
        <p style={{ fontSize: 14, color: '#94a3b8', margin: 0 }}>
          Loading Virtual Lab...
        </p>
      </div>
    </div>
  ),
})

export default function VirtualLabPage() {
  const [error, setError] = useState<Error | null>(null)
  
  useEffect(() => {
    window.onerror = (msg, src, line, col, err) => {
      console.error('[VirtualLab] window.onerror:', msg, src, line, err)
      setError(err || new Error(String(msg)))
    }
    window.addEventListener('unhandledrejection', (e) => {
      console.error('[VirtualLab] unhandledrejection:', e.reason)
      setError(e.reason instanceof Error ? e.reason : new Error(String(e.reason)))
    })
  }, [])

  if (error) {
    return (
      <div style={{ padding: 40, color: '#ef4444', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
        <h2>Runtime Error:</h2>
        <p>{error.message}</p>
        <p>{error.stack}</p>
      </div>
    )
  }

  return <VirtualLabShell />
}
