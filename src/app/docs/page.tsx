'use client'

import React, { useState } from 'react'
import { ApiDocsGenerator } from '../api-docs-generator'
import { DevToolsPanel } from '../dev-tools-panel'

export default function DocsPage() {
  const [view, setView] = useState<'docs' | 'devtools'>('docs')

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--dt-bg)',
        color: 'var(--dt-text)',
      }}
    >
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'var(--dt-bg)',
          borderBottom: '1px solid var(--dt-border)',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          backdropFilter: 'blur(8px)',
        }}
        role="navigation"
        aria-label="Docs navigation"
      >
        <div style={{ marginRight: 24, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0' }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: 'linear-gradient(135deg, #10b981, #06b6d4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
            }}
          >
            🔬
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.3px' }}>
            Virtual Lab
          </span>
        </div>

        <button
          onClick={() => setView('docs')}
          style={{
            padding: '12px 20px',
            fontSize: 13,
            fontWeight: 600,
            color: view === 'docs' ? 'var(--dt-accent)' : 'var(--dt-text-muted)',
            background: 'none',
            border: 'none',
            borderBottom: view === 'docs' ? '2px solid var(--dt-accent)' : '2px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
          role="tab"
          aria-selected={view === 'docs'}
        >
          <span>📖</span> API Documentation
        </button>

        <button
          onClick={() => setView('devtools')}
          style={{
            padding: '12px 20px',
            fontSize: 13,
            fontWeight: 600,
            color: view === 'devtools' ? 'var(--dt-accent)' : 'var(--dt-text-muted)',
            background: 'none',
            border: 'none',
            borderBottom: view === 'devtools' ? '2px solid var(--dt-accent)' : '2px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
          role="tab"
          aria-selected={view === 'devtools'}
        >
          <span>🛠️</span> Dev Tools
        </button>
      </nav>

      <main>
        {view === 'docs' && <ApiDocsGenerator />}
        {view === 'devtools' && (
          <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>
            <header style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px', margin: '0 0 6px' }}>
                Developer Tools
              </h1>
              <p style={{ fontSize: 15, color: 'var(--dt-text-secondary)', margin: 0 }}>
                API playground, data explorer, performance monitoring, and feature flags.
              </p>
            </header>
            <DevToolsPanel />
          </div>
        )}
      </main>
    </div>
  )
}
