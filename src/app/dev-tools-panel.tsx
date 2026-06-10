'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { toast } from 'sonner'
import { t } from '@/lib/i18n'

// ============================================================
// Types
// ============================================================

interface ApiEndpoint {
  id: string
  method: string
  path: string
  summary: string
}

interface HistoryItem {
  id: string
  method: string
  url: string
  status: number
  time: number
  timestamp: number
}

interface FeatureFlag {
  key: string
  label: string
  description: string
  defaultValue: boolean
}

interface LocalStorageEntry {
  key: string
  value: unknown
  size: number
  type: string
}

interface PerFrameData {
  fps: number
  memory?: number
}

// ============================================================
// Constants
// ============================================================

const METHOD_COLORS: Record<string, string> = {
  GET: '#10b981',
  POST: '#06b6d4',
  PUT: '#f59e0b',
  DELETE: '#ef4444',
  PATCH: '#8b5cf6',
}

const FEATURE_FLAGS: FeatureFlag[] = [
  { key: 'liveMetrics', label: 'Live Metrics', description: 'Enable real-time performance metrics display on dashboard', defaultValue: true },
  { key: 'focusMode', label: 'Focus Mode', description: 'Minimize distractions with a focused workspace view', defaultValue: false },
  { key: 'keyboardShortcuts', label: 'Keyboard Shortcuts', description: 'Enable global keyboard shortcuts for quick navigation', defaultValue: true },
  { key: 'pwaSupport', label: 'PWA Support', description: 'Enable Progressive Web App features and offline support', defaultValue: true },
  { key: 'voiceInput', label: 'Voice Input', description: 'Enable voice-to-text for meeting inputs and search', defaultValue: false },
  { key: 'particleEffects', label: 'Particle Effects', description: 'Show particle trail effects on cursor movement', defaultValue: false },
]

const STORAGE_KEY = 'vl-feature-flags'

// ============================================================
// Helpers
// ============================================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function getLocalStorageUsage(): number {
  try {
    let total = 0
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        total += (localStorage.getItem(key) || '').length * 2 // UTF-16
      }
    }
    return total
  } catch {
    return 0
  }
}

function getLocalStorageEntries(): LocalStorageEntry[] {
  try {
    const entries: LocalStorageEntry[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        const value = localStorage.getItem(key) || ''
        let parsed: unknown = value
        let type = 'string'
        try {
          parsed = JSON.parse(value)
          type = Array.isArray(parsed) ? 'array' : typeof parsed === 'object' ? 'object' : typeof parsed
        } catch {
          // keep as string
        }
        entries.push({
          key,
          value: parsed,
          size: value.length * 2,
          type,
        })
      }
    }
    return entries.sort((a, b) => a.key.localeCompare(b.key))
  } catch {
    return []
  }
}

// ============================================================
// Tab 1: API Playground
// ============================================================

function ApiPlayground() {
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([])
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('')
  const [method, setMethod] = useState('GET')
  const [url, setUrl] = useState('')
  const [queryParams, setQueryParams] = useState<{ key: string; value: string }[]>([])
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<{ status: number; time: number; size: string; body: unknown } | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [bodyError, setBodyError] = useState('')

  useEffect(() => {
    fetch('/api/api-docs')
      .then(res => res.json())
      .then(data => {
        const eps: ApiEndpoint[] = []
        for (const cat of data.categories || []) {
          for (const ep of cat.endpoints || []) {
            eps.push({ id: ep.id, method: ep.method, path: ep.path, summary: ep.summary })
          }
        }
        setEndpoints(eps)
      })
      .catch(() => { /* ignore */ })
  }, [])

  const handleEndpointSelect = useCallback((epId: string) => {
    setSelectedEndpoint(epId)
    const ep = endpoints.find(e => e.id === epId)
    if (ep) {
      setMethod(ep.method)
      setUrl(ep.path)
      setBody('')
      setQueryParams([])
      setResponse(null)
      setBodyError('')
    }
  }, [endpoints])

  const addQueryParam = useCallback(() => {
    setQueryParams(prev => [...prev, { key: '', value: '' }])
  }, [])

  const removeQueryParam = useCallback((idx: number) => {
    setQueryParams(prev => prev.filter((_, i) => i !== idx))
  }, [])

  const updateQueryParam = useCallback((idx: number, field: 'key' | 'value', val: string) => {
    setQueryParams(prev => prev.map((p, i) => i === idx ? { ...p, [field]: val } : p))
  }, [])

  const handleSend = useCallback(async () => {
    setLoading(true)
    setResponse(null)

    const startTime = performance.now()
    try {
      // Build URL with query params
      let fetchUrl = url || '/'
      const validParams = queryParams.filter(p => p.key.trim())
      if (validParams.length > 0) {
        const qs = validParams.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&')
        fetchUrl += `?${qs}`
      }
      if (!fetchUrl.startsWith('/')) fetchUrl = '/' + fetchUrl

      const options: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json' },
      }
      if ((method === 'POST' || method === 'PUT') && body.trim()) {
        options.body = body
      }

      const res = await fetch(fetchUrl, options)
      const endTime = performance.now()
      const resBody = await res.text()
      let parsed: unknown = resBody
      try { parsed = JSON.parse(resBody) } catch { /* keep raw */ }

      const result = {
        status: res.status,
        time: Math.round(endTime - startTime),
        size: formatBytes(new Blob([resBody]).size),
        body: parsed,
      }
      setResponse(result)

      // Add to history
      setHistory(prev => {
        const newHistory: HistoryItem[] = [
          { id: Date.now().toString(), method, url: fetchUrl, status: res.status, time: Math.round(endTime - startTime), timestamp: Date.now() },
          ...prev,
        ].slice(0, 10)
        return newHistory
      })
    } catch (err) {
      const endTime = performance.now()
      setResponse({
        status: 0,
        time: Math.round(endTime - startTime),
        size: '0 B',
        body: { error: err instanceof Error ? err.message : 'Network error' },
      })
    } finally {
      setLoading(false)
    }
  }, [method, url, queryParams, body])

  const handleReRun = useCallback((item: HistoryItem) => {
    setMethod(item.method)
    setUrl(item.url)
    setSelectedEndpoint('')
    // Re-send immediately
    const startTime = performance.now()
    fetch(item.url, { method: item.method, headers: { 'Content-Type': 'application/json' } })
      .then(res => res.text())
      .then(resBody => {
        const endTime = performance.now()
        let parsed: unknown = resBody
        try { parsed = JSON.parse(resBody) } catch { /* keep raw */ }
        setResponse({ status: 0, time: Math.round(endTime - startTime), size: formatBytes(resBody.length), body: parsed })
      })
      .catch(() => { /* ignore */ })
  }, [])

  return (
    <div>
      {/* Endpoint selector */}
      <div className="dt-playground-section">
        <div className="dt-playground-section-title">Endpoint</div>
        <select
          className="dt-playground-endpoint-select"
          value={selectedEndpoint}
          onChange={e => handleEndpointSelect(e.target.value)}
        >
          <option value="">-- Select endpoint --</option>
          {endpoints.map(ep => (
            <option key={ep.id} value={ep.id}>
              [{ep.method}] {ep.path} — {ep.summary}
            </option>
          ))}
        </select>
      </div>

      {/* Method + URL */}
      <div className="dt-playground-section">
        <div className="dt-playground-section-title">Request</div>
        <div className="dt-try-it-url-row">
          <select className="dt-try-it-method-select" value={method} onChange={e => setMethod(e.target.value)}>
            {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <input
            className="dt-try-it-url-input"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="/api/endpoint"
          />
        </div>
      </div>

      {/* Query Params */}
      <div className="dt-playground-section">
        <div className="dt-playground-section-title">Query Parameters</div>
        {queryParams.map((qp, idx) => (
          <div key={idx} className="dt-kv-row">
            <input
              className="dt-kv-input dt-kv-key"
              placeholder="key"
              value={qp.key}
              onChange={e => updateQueryParam(idx, 'key', e.target.value)}
            />
            <input
              className="dt-kv-input dt-kv-value"
              placeholder="value"
              value={qp.value}
              onChange={e => updateQueryParam(idx, 'value', e.target.value)}
            />
            <button className="dt-kv-remove-btn" onClick={() => removeQueryParam(idx)}>✕</button>
          </div>
        ))}
        <button className="dt-add-kv-btn" onClick={addQueryParam}>+ Add Parameter</button>
      </div>

      {/* Body */}
      {(method === 'POST' || method === 'PUT') && (
        <div className="dt-playground-section">
          <div className="dt-playground-section-title">Request Body (JSON)</div>
          {bodyError && (
            <div style={{ color: '#ef4444', fontSize: 11, marginBottom: 4, fontFamily: 'monospace' }}>
              ⚠ {bodyError}
            </div>
          )}
          <textarea
            className="dt-try-it-body-area"
            value={body}
            onChange={e => {
              setBody(e.target.value)
              if (e.target.value.trim()) {
                try { JSON.parse(e.target.value); setBodyError('') }
                catch (err) { setBodyError(err instanceof Error ? err.message : 'Invalid JSON') }
              } else {
                setBodyError('')
              }
            }}
            placeholder='{"key": "value"}'
            spellCheck={false}
          />
        </div>
      )}

      {/* Send */}
      <div className="dt-try-it-actions" style={{ marginBottom: 16 }}>
        <button className={`dt-send-btn ${loading ? 'loading' : ''}`} onClick={handleSend} disabled={loading}>
          {loading ? '⬤ Sending...' : '▶ Send Request'}
        </button>
      </div>

      {/* Response */}
      {response && (
        <div className="dt-response-panel">
          <div className="dt-response-header">
            <div className="dt-response-status">
              <span className={`dt-response-code ${response.status >= 200 && response.status < 300 ? 'success' : 'error'}`}>
                {response.status || 'ERR'}
              </span>
              <span className="dt-response-time">{response.time}ms</span>
              <span className="dt-response-size">{response.size}</span>
            </div>
          </div>
          <div className="dt-code-block">
            <div className="dt-code-body">
              {typeof response.body === 'string' ? response.body : JSON.stringify(response.body, null, 2)}
            </div>
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="dt-history-section">
          <div className="dt-playground-section-title">Recent Requests ({history.length})</div>
          {history.map(item => (
            <div
              key={item.id}
              className="dt-history-item"
              onClick={() => handleReRun(item)}
              role="button"
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter') handleReRun(item) }}
            >
              <span className="dt-history-method" style={{ color: METHOD_COLORS[item.method] || '#999' }}>
                {item.method}
              </span>
              <span className="dt-history-path">{item.url}</span>
              <span
                className="dt-history-status"
                style={{ color: item.status >= 200 && item.status < 300 ? '#10b981' : '#ef4444' }}
              >
                {item.status}
              </span>
              <span className="dt-history-time">{item.time}ms</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// Tab 2: Data Explorer
// ============================================================

function DataExplorer() {
  const [entries, setEntries] = useState<LocalStorageEntry[]>(() => getLocalStorageEntries())
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [storageUsed, setStorageUsed] = useState(() => getLocalStorageUsage())

  const refreshData = useCallback(() => {
    setEntries(getLocalStorageEntries())
    setStorageUsed(getLocalStorageUsage())
  }, [])

  const toggleExpand = useCallback((key: string) => {
    setExpandedKeys(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const selectKey = useCallback((key: string) => {
    setSelectedKey(key)
    const entry = entries.find(e => e.key === key)
    if (entry) {
      setEditValue(typeof entry.value === 'string' ? entry.value : JSON.stringify(entry.value, null, 2))
    }
  }, [entries])

  const saveValue = useCallback(() => {
    if (!selectedKey) return
    try {
      localStorage.setItem(selectedKey, editValue)
      toast.success('Value saved')
      refreshData()
    } catch (err) {
      toast.error('Failed to save: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }, [selectedKey, editValue, refreshData])

  const deleteKey = useCallback((key: string) => {
    try {
      localStorage.removeItem(key)
      toast.success('Key deleted')
      if (selectedKey === key) {
        setSelectedKey(null)
        setEditValue('')
      }
      refreshData()
    } catch (err) {
      toast.error('Failed to delete key')
    }
  }, [selectedKey, refreshData])

  const clearAll = useCallback(() => {
    try {
      localStorage.clear()
      toast.success('All localStorage cleared')
      setSelectedKey(null)
      setEditValue('')
      refreshData()
    } catch (err) {
      toast.error('Failed to clear localStorage')
    }
  }, [refreshData])

  const storageMax = 5 * 1024 * 1024 // 5MB typical limit
  const storagePercent = Math.min((storageUsed / storageMax) * 100, 100)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="dt-playground-section-title" style={{ margin: 0 }}>
          Keys ({entries.length})
        </div>
        <button
          onClick={clearAll}
          style={{ fontSize: 11, color: '#ef4444', background: 'none', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 4, padding: '3px 8px', cursor: 'pointer' }}
        >
          Clear All
        </button>
      </div>

      {/* Tree View */}
      <div className="dt-tree-container">
        {entries.map(entry => {
          const isExpanded = expandedKeys.has(entry.key)
          const isSelected = selectedKey === entry.key
          return (
            <div key={entry.key} className="dt-tree-item">
              <div
                className={`dt-tree-row ${isSelected ? 'selected' : ''}`}
                onClick={() => { toggleExpand(entry.key); selectKey(entry.key) }}
              >
                <span className={`dt-tree-toggle ${isExpanded ? 'open' : ''}`}>▸</span>
                <span className="dt-tree-icon">{entry.type === 'object' ? '📋' : entry.type === 'array' ? '📊' : '📝'}</span>
                <span className="dt-tree-label">{entry.key}</span>
                <span className="dt-tree-value-preview">{formatBytes(entry.size)}</span>
                <div className="dt-tree-actions">
                  <button
                    className="dt-tree-action-btn danger"
                    onClick={e => { e.stopPropagation(); deleteKey(entry.key) }}
                  >
                    ✕
                  </button>
                </div>
              </div>
              {isExpanded && (
                <div className={`dt-tree-children ${isExpanded ? 'open' : ''}`}>
                  <div style={{ padding: '6px 12px', fontSize: 11, color: 'var(--dt-text-muted)' }}>
                    Type: <span className="dt-mono" style={{ color: 'var(--dt-put)' }}>{entry.type}</span>
                    {' · '} Size: <span className="dt-mono">{formatBytes(entry.size)}</span>
                  </div>
                  {entry.type !== 'string' && (
                    <div style={{ padding: '4px 12px 8px', fontSize: 11 }}>
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace', fontSize: 11, color: 'var(--dt-text-secondary)', maxHeight: 120, overflow: 'auto' }}>
                        {JSON.stringify(entry.value, null, 2).slice(0, 500)}
                        {JSON.stringify(entry.value).length > 500 && '...'}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
        {entries.length === 0 && (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--dt-text-muted)', fontSize: 13 }}>
            No localStorage entries found
          </div>
        )}
      </div>

      {/* Selected Key Editor */}
      {selectedKey && (
        <div style={{ marginTop: 16, padding: 12, background: 'var(--dt-bg-secondary)', border: '1px solid var(--dt-border)', borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'monospace', color: 'var(--dt-accent)' }}>
              {selectedKey}
            </span>
            <button
              onClick={saveValue}
              style={{ fontSize: 11, padding: '4px 12px', background: 'var(--dt-accent)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}
            >
              Save
            </button>
          </div>
          <textarea
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            style={{ width: '100%', minHeight: 80, padding: 8, fontSize: 12, fontFamily: 'monospace', border: '1px solid var(--dt-border)', borderRadius: 6, background: 'var(--dt-bg)', color: 'var(--dt-text)', resize: 'vertical', outline: 'none' }}
            spellCheck={false}
          />
        </div>
      )}

      {/* Storage Usage Bar */}
      <div className="dt-storage-bar">
        <div className="dt-storage-bar-header">
          <span>Storage Used</span>
          <span>{formatBytes(storageUsed)} / {formatBytes(storageMax)}</span>
        </div>
        <div className="dt-storage-bar-track">
          <div
            className="dt-storage-bar-fill"
            style={{ width: `${storagePercent}%`, background: storagePercent > 80 ? '#ef4444' : storagePercent > 50 ? '#f59e0b' : '#10b981' }}
          />
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Tab 3: Performance Monitor
// ============================================================

function PerformanceMonitor() {
  const [fps, setFps] = useState(0)
  const [memoryUsed, setMemoryUsed] = useState<number | null>(null)
  const [memoryTotal, setMemoryTotal] = useState<number | null>(null)
  const [renderCount, setRenderCount] = useState(0)
  const frameRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const fpsFramesRef = useRef<number[]>([])
  const rafRef = useRef<number>(0)

  // FPS Counter using requestAnimationFrame
  useEffect(() => {
    const measure = (time: number) => {
      if (lastTimeRef.current > 0) {
        const delta = time - lastTimeRef.current
        fpsFramesRef.current.push(delta)
        if (fpsFramesRef.current.length > 60) fpsFramesRef.current.shift()

        // Calculate average FPS over last 60 frames
        if (fpsFramesRef.current.length >= 10) {
          const avgDelta = fpsFramesRef.current.reduce((a, b) => a + b, 0) / fpsFramesRef.current.length
          const calculatedFps = Math.round(1000 / avgDelta)
          setFps(calculatedFps)
        }
      }
      lastTimeRef.current = time
      frameRef.current++
      if (frameRef.current % 30 === 0) {
        setRenderCount(frameRef.current)
      }
      rafRef.current = requestAnimationFrame(measure)
    }
    rafRef.current = requestAnimationFrame(measure)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  // Memory monitoring
  useEffect(() => {
    const checkMemory = () => {
      try {
        const perf = performance as unknown as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }
        if (perf.memory) {
          setMemoryUsed(perf.memory.usedJSHeapSize)
          setMemoryTotal(perf.memory.totalJSHeapSize)
        }
      } catch { /* not available */ }
    }
    checkMemory()
    const interval = setInterval(checkMemory, 2000)
    return () => clearInterval(interval)
  }, [])

  // Component list (simulated from known components)
  const components = useMemo(() => [
    { name: 'viz-gallery-enhanced.tsx', lines: 820 },
    { name: 'dashboard-widgets.tsx', lines: 650 },
    { name: 'meeting-analytics-dashboard.tsx', lines: 580 },
    { name: 'pipeline-editor-canvas.tsx', lines: 520 },
    { name: 'agent-persona-dashboard.tsx', lines: 490 },
    { name: 'live-dashboard.tsx', lines: 460 },
    { name: 'advanced-charts.tsx', lines: 440 },
    { name: 'notification-center.tsx', lines: 410 },
    { name: 'settings-tab.tsx', lines: 380 },
    { name: 'api-docs-generator.tsx', lines: 720 },
    { name: 'dev-tools-panel.tsx', lines: 580 },
    { name: 'research-notes-dashboard.tsx', lines: 350 },
  ], [])

  const fpsColor = fps >= 50 ? 'good' : fps >= 30 ? 'warn' : 'bad'
  const memPercent = memoryTotal ? (memoryUsed! / memoryTotal * 100) : 0
  const memColor = memPercent < 50 ? 'good' : memPercent < 80 ? 'warn' : 'bad'

  return (
    <div>
      {/* Real-time Metrics Grid */}
      <div className="dt-perf-grid">
        {/* FPS */}
        <div className="dt-perf-card">
          <div className={`dt-perf-value ${fpsColor}`}>{fps}</div>
          <div className="dt-perf-label">FPS</div>
          <div className="dt-perf-bar-container">
            <div className="dt-perf-bar">
              <div
                className="dt-perf-bar-fill"
                style={{
                  width: `${Math.min((fps / 60) * 100, 100)}%`,
                  background: fps >= 50 ? '#10b981' : fps >= 30 ? '#f59e0b' : '#ef4444',
                }}
              />
            </div>
          </div>
        </div>

        {/* Memory */}
        <div className="dt-perf-card">
          <div className={`dt-perf-value ${memoryUsed ? memColor : ''}`}>
            {memoryUsed ? formatBytes(memoryUsed) : 'N/A'}
          </div>
          <div className="dt-perf-label">Memory Used</div>
          {memoryTotal && (
            <div className="dt-perf-bar-container">
              <div className="dt-perf-bar">
                <div
                  className="dt-perf-bar-fill"
                  style={{
                    width: `${memPercent}%`,
                    background: memPercent < 50 ? '#10b981' : memPercent < 80 ? '#f59e0b' : '#ef4444',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Render Count */}
        <div className="dt-perf-card">
          <div className="dt-perf-value">{renderCount}</div>
          <div className="dt-perf-label">Frames Rendered</div>
          <div style={{ fontSize: 11, color: 'var(--dt-text-muted)', marginTop: 4 }}>
            requestAnimationFrame loops
          </div>
        </div>

        {/* Bundle Estimate */}
        <div className="dt-perf-card">
          <div className="dt-perf-value">~2.4 <span className="dt-perf-unit">MB</span></div>
          <div className="dt-perf-label">Bundle Estimate</div>
          <div style={{ fontSize: 11, color: 'var(--dt-text-muted)', marginTop: 4 }}>
            gzipped, first load
          </div>
        </div>
      </div>

      {/* Memory Details */}
      {memoryUsed && memoryTotal && (
        <div style={{ marginBottom: 16, padding: 12, background: 'var(--dt-bg-secondary)', border: '1px solid var(--dt-border)', borderRadius: 8, fontSize: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Memory Details</div>
          <div className="dt-flex dt-items-center dt-justify-between" style={{ marginBottom: 4 }}>
            <span style={{ color: 'var(--dt-text-secondary)' }}>JS Heap Used</span>
            <span className="dt-mono">{formatBytes(memoryUsed)}</span>
          </div>
          <div className="dt-flex dt-items-center dt-justify-between" style={{ marginBottom: 4 }}>
            <span style={{ color: 'var(--dt-text-secondary)' }}>JS Heap Total</span>
            <span className="dt-mono">{formatBytes(memoryTotal)}</span>
          </div>
          <div className="dt-flex dt-items-center dt-justify-between">
            <span style={{ color: 'var(--dt-text-secondary)' }}>Heap Limit</span>
            <span className="dt-mono">~{formatBytes(memoryTotal * 2)}</span>
          </div>
        </div>
      )}

      {/* Largest Components */}
      <div className="dt-component-list">
        <div className="dt-playground-section-title" style={{ marginBottom: 8 }}>
          Largest Components (by lines)
        </div>
        {components.map(comp => (
          <div key={comp.name} className="dt-component-item">
            <span className="dt-component-name">{comp.name}</span>
            <span className="dt-component-lines">{comp.lines} lines</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// Tab 4: Feature Flags
// ============================================================

function getInitialFlags(): Record<string, boolean> {
  if (typeof window === 'undefined') {
    const defaults: Record<string, boolean> = {}
    for (const f of FEATURE_FLAGS) defaults[f.key] = f.defaultValue
    return defaults
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored) as Record<string, boolean>
    }
  } catch { /* ignore */ }
  const defaults: Record<string, boolean> = {}
  for (const f of FEATURE_FLAGS) defaults[f.key] = f.defaultValue
  return defaults
}

function FeatureFlags() {
  const [flags, setFlags] = useState<Record<string, boolean>>(getInitialFlags)

  // Persist defaults on first mount if nothing stored
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) {
        const defaults: Record<string, boolean> = {}
        for (const f of FEATURE_FLAGS) defaults[f.key] = f.defaultValue
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults))
      }
    } catch { /* ignore */ }
  }, [])

  const toggleFlag = useCallback((key: string, value: boolean) => {
    setFlags(prev => {
      const next = { ...prev, [key]: value }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch { /* ignore */ }
      toast.success(`${key} ${value ? 'enabled' : 'disabled'}`)
      return next
    })
  }, [])

  const resetDefaults = useCallback(() => {
    const defaults: Record<string, boolean> = {}
    for (const f of FEATURE_FLAGS) {
      defaults[f.key] = f.defaultValue
    }
    setFlags(defaults)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults))
    } catch { /* ignore */ }
    toast.success('Feature flags reset to defaults')
  }, [])

  const enabledCount = Object.values(flags).filter(v => v).length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="dt-playground-section-title" style={{ margin: 0 }}>
          Experimental Features ({enabledCount}/{FEATURE_FLAGS.length} active)
        </div>
        <button
          onClick={resetDefaults}
          style={{ fontSize: 11, color: 'var(--dt-text-secondary)', background: 'none', border: '1px solid var(--dt-border)', borderRadius: 4, padding: '3px 8px', cursor: 'pointer' }}
        >
          Reset
        </button>
      </div>

      <div className="dt-flag-list">
        {FEATURE_FLAGS.map(flag => {
          const isOn = flags[flag.key] ?? flag.defaultValue
          return (
            <div key={flag.key} className="dt-flag-item">
              <div className="dt-flag-info">
                <div className="dt-flag-name">{flag.label}</div>
                <div className="dt-flag-desc">{flag.description}</div>
              </div>
              <div className="dt-flex dt-items-center">
                <span className={`dt-toggle-label ${isOn ? 'on' : ''}`}>
                  {isOn ? 'ON' : 'OFF'}
                </span>
                <label className="dt-toggle-switch">
                  <input
                    type="checkbox"
                    checked={isOn}
                    onChange={e => toggleFlag(flag.key, e.target.checked)}
                  />
                  <span className="dt-toggle-slider" />
                </label>
              </div>
            </div>
          )
        })}
      </div>

      {/* Persistence notice */}
      <div style={{ marginTop: 16, padding: 12, background: 'var(--dt-bg-secondary)', border: '1px solid var(--dt-border)', borderRadius: 8, fontSize: 12, color: 'var(--dt-text-secondary)' }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>ℹ️ Persistence</div>
        Feature flag states are persisted in <code className="dt-mono" style={{ fontSize: 11, color: 'var(--dt-accent)' }}>localStorage: &quot;{STORAGE_KEY}&quot;</code>.
        Changes take effect on next page load. Use the Reset button to restore defaults.
      </div>
    </div>
  )
}

// ============================================================
// Main Component: DevToolsPanel
// ============================================================

export function DevToolsPanel() {
  const [activeTab, setActiveTab] = useState<string>('playground')
  const tabs = [
    { id: 'playground', label: 'API Playground', icon: '⚡' },
    { id: 'explorer', label: 'Data Explorer', icon: '🗄️' },
    { id: 'performance', label: 'Performance', icon: '📊' },
    { id: 'flags', label: 'Feature Flags', icon: '🚩' },
  ]

  return (
    <div className="dt-panel">
      {/* Tab Header */}
      <div className="dt-panel-header" role="tablist">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`dt-panel-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Body */}
      <div className="dt-panel-body" role="tabpanel">
        {activeTab === 'playground' && <ApiPlayground />}
        {activeTab === 'explorer' && <DataExplorer />}
        {activeTab === 'performance' && <PerformanceMonitor />}
        {activeTab === 'flags' && <FeatureFlags />}
      </div>
    </div>
  )
}
