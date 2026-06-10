'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { t } from '@/lib/i18n'

// ============================================================
// Types
// ============================================================

interface ApiParameter {
  name: string
  type: string
  required: boolean
  description: string
}

interface ApiBodyField {
  name: string
  type: string
  required: boolean
  description: string
  default?: string
}

interface ApiResponseExample {
  status: number
  description: string
  body: Record<string, unknown>
}

interface ApiEndpoint {
  id: string
  method: string
  path: string
  summary: string
  description: string
  category: string
  parameters: ApiParameter[]
  bodyFields: ApiBodyField[]
  responses: ApiResponseExample[]
}

interface ApiCategory {
  name: string
  icon: string
  color: string
  endpoints: ApiEndpoint[]
}

interface ApiResponse {
  status: number
  time: number
  size: string
  body: unknown
}

interface DocsStats {
  totalEndpoints: number
  totalCategories: number
  methodCounts: Record<string, number>
}

// ============================================================
// Utility: Method color map
// ============================================================

const METHOD_COLORS: Record<string, string> = {
  GET: 'get',
  POST: 'post',
  PUT: 'put',
  DELETE: 'delete',
  PATCH: 'patch',
}

const METHOD_TEXT_COLORS: Record<string, string> = {
  GET: '#10b981',
  POST: '#06b6d4',
  PUT: '#f59e0b',
  DELETE: '#ef4444',
  PATCH: '#8b5cf6',
}

// ============================================================
// CSS-based Syntax Highlighting
// ============================================================

function highlightJson(json: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = []
  let i = 0
  const len = json.length

  while (i < len) {
    // Whitespace
    if (/\s/.test(json[i])) {
      const start = i
      while (i < len && /\s/.test(json[i])) i++
      tokens.push(json.slice(start, i))
      continue
    }

    // Strings
    if (json[i] === '"') {
      const start = i
      i++
      while (i < len && json[i] !== '"') {
        if (json[i] === '\\') i++
        i++
      }
      i++ // closing quote
      const str = json.slice(start, i)
      // Check if it's a property (key before colon)
      const before = json.slice(0, start).trimEnd()
      if (before.endsWith(':') || /[,{\[]\s*$/.test(before)) {
        // Actually check if the NEXT non-space is a colon — it's a key
      }
      // Check if preceding non-space char suggests this is a key
      const afterTrimmed = json.slice(0, start).trimRight()
      const isKey = !afterTrimmed || /[{,\[]\s*$/.test(afterTrimmed) || afterTrimmed.endsWith(':')
      if (isKey && !afterTrimmed.endsWith(':')) {
        tokens.push(<span key={start} className="dt-token-property">{str}</span>)
      } else {
        tokens.push(<span key={start} className="dt-token-string">{str}</span>)
      }
      continue
    }

    // Numbers
    if (/[\d]/.test(json[i]) || (json[i] === '-' && i + 1 < len && /[\d]/.test(json[i + 1]))) {
      const start = i
      if (json[i] === '-') i++
      while (i < len && /[\d.eE+-]/.test(json[i])) i++
      tokens.push(<span key={start} className="dt-token-number">{json.slice(start, i)}</span>)
      continue
    }

    // Keywords
    const remaining = json.slice(i)
    if (remaining.startsWith('true') && !/[\w]/.test(json[i + 4] || '')) {
      tokens.push(<span key={i} className="dt-token-boolean">true</span>)
      i += 4
      continue
    }
    if (remaining.startsWith('false') && !/[\w]/.test(json[i + 5] || '')) {
      tokens.push(<span key={i} className="dt-token-boolean">false</span>)
      i += 5
      continue
    }
    if (remaining.startsWith('null') && !/[\w]/.test(json[i + 4] || '')) {
      tokens.push(<span key={i} className="dt-token-null">null</span>)
      i += 4
      continue
    }

    // Brackets
    if ('{}[]'.includes(json[i])) {
      tokens.push(<span key={i} className="dt-token-bracket">{json[i]}</span>)
      i++
      continue
    }

    // Punctuation
    if (',:'.includes(json[i])) {
      tokens.push(<span key={i} className="dt-token-punctuation">{json[i]}</span>)
      i++
      continue
    }

    // Fallback
    tokens.push(json[i])
    i++
  }

  return tokens
}

function highlightCurl(curl: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = []
  const parts = curl.split(/(\s+)/)
  let keyIdx = 0

  for (const part of parts) {
    if (part.trim() === '') {
      tokens.push(part)
      continue
    }
    if (part === 'curl') {
      tokens.push(<span key={keyIdx++} className="dt-token-keyword">{part}</span>)
    } else if (part.startsWith('-')) {
      tokens.push(<span key={keyIdx++} className="dt-token-flag">{part}</span>)
    } else if (part.startsWith('http')) {
      tokens.push(<span key={keyIdx++} className="dt-token-url">{part}</span>)
    } else if (part.startsWith("'") || part.startsWith('"')) {
      tokens.push(<span key={keyIdx++} className="dt-token-string">{part}</span>)
    } else if (part.toUpperCase() === 'GET' || part.toUpperCase() === 'POST' || part.toUpperCase() === 'PUT' || part.toUpperCase() === 'DELETE') {
      tokens.push(<span key={keyIdx++} className="dt-token-method">{part}</span>)
    } else {
      tokens.push(<span key={keyIdx++} className="dt-token-punctuation">{part}</span>)
    }
  }

  return tokens
}

// ============================================================
// CodeBlock Component
// ============================================================

function CodeBlock({
  code,
  language,
  onCopy,
}: {
  code: string
  language: string
  onCopy?: () => void
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    onCopy?.()
    setTimeout(() => setCopied(false), 2000)
  }, [code, onCopy])

  return (
    <div className="dt-code-block">
      <div className="dt-code-header">
        <span className="dt-code-lang">{language}</span>
        <button className="dt-code-copy-btn" onClick={handleCopy}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <div className="dt-code-body">
        {language === 'json' ? highlightJson(code) : language === 'bash' ? highlightCurl(code) : code}
      </div>
    </div>
  )
}

// ============================================================
// TryItPanel Component
// ============================================================

function TryItPanel({ endpoint }: { endpoint: ApiEndpoint }) {
  const [method, setMethod] = useState(endpoint.method)
  const [url, setUrl] = useState(endpoint.path)
  const [body, setBody] = useState(() => {
    if (endpoint.bodyFields.length > 0) {
      const obj: Record<string, unknown> = {}
      for (const f of endpoint.bodyFields) {
        if (f.default && f.default !== '—') {
          try {
            obj[f.name] = JSON.parse(f.default)
          } catch {
            obj[f.name] = f.default
          }
        } else if (f.type === 'string') {
          obj[f.name] = ''
        } else if (f.type === 'number') {
          obj[f.name] = 0
        } else if (f.type.endsWith('[]')) {
          obj[f.name] = []
        } else {
          obj[f.name] = null
        }
      }
      return JSON.stringify(obj, null, 2)
    }
    return ''
  })
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<ApiResponse | null>(null)
  const [jsonError, setJsonError] = useState('')

  const generateCurl = useCallback(() => {
    let cmd = `curl -X ${method} '${url}'`
    if (method === 'POST' || method === 'PUT') {
      cmd += ` \\\n  -H 'Content-Type: application/json'`
      cmd += ` \\\n  -d '${body}'`
    }
    return cmd
  }, [method, url, body])

  const handleSend = useCallback(async () => {
    if (jsonError) {
      toast.error('Fix JSON errors before sending')
      return
    }
    setLoading(true)
    setResponse(null)
    const startTime = performance.now()

    try {
      const fetchUrl = url.startsWith('/') ? url : `/${url}`
      const options: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json' },
      }
      if (method === 'POST' || method === 'PUT') {
        options.body = body || '{}'
      }

      const res = await fetch(fetchUrl, options)
      const endTime = performance.now()
      const resBody = await res.text()
      let parsed: unknown = resBody
      try {
        parsed = JSON.parse(resBody)
      } catch { /* keep raw text */ }

      setResponse({
        status: res.status,
        time: Math.round(endTime - startTime),
        size: new Blob([resBody]).size > 1024
          ? `${(new Blob([resBody]).size / 1024).toFixed(1)} KB`
          : `${new Blob([resBody]).size} B`,
        body: parsed,
      })
    } catch (err) {
      const endTime = performance.now()
      setResponse({
        status: 0,
        time: Math.round(endTime - startTime),
        size: '0 B',
        body: { error: err instanceof Error ? err.message : 'Request failed' },
      })
    } finally {
      setLoading(false)
    }
  }, [method, url, body, jsonError])

  const handleCopyCurl = useCallback(() => {
    navigator.clipboard.writeText(generateCurl())
    toast.success(t('en', 'common.copied'))
  }, [generateCurl])

  const handleBodyChange = useCallback((val: string) => {
    setBody(val)
    if (val.trim()) {
      try {
        JSON.parse(val)
        setJsonError('')
      } catch (e) {
        setJsonError(e instanceof Error ? e.message : 'Invalid JSON')
      }
    } else {
      setJsonError('')
    }
  }, [])

  return (
    <div className="dt-try-it-panel">
      <div className="dt-try-it-url-row">
        <select
          className="dt-try-it-method-select"
          value={method}
          onChange={e => setMethod(e.target.value)}
        >
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

      {(method === 'POST' || method === 'PUT') && (
        <div className="dt-mb-12">
          <div className="dt-section-label">Request Body (JSON)</div>
          {jsonError && (
            <div style={{ color: '#ef4444', fontSize: 11, marginBottom: 4, fontFamily: 'monospace' }}>
              ⚠ {jsonError}
            </div>
          )}
          <textarea
            className="dt-try-it-body-area"
            value={body}
            onChange={e => handleBodyChange(e.target.value)}
            spellCheck={false}
          />
        </div>
      )}

      <div className="dt-try-it-actions">
        <button
          className={`dt-send-btn ${loading ? 'loading' : ''}`}
          onClick={handleSend}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="dt-animate-pulse">⬤</span>
              Sending...
            </>
          ) : (
            <>▶ Send Request</>
          )}
        </button>
        <button className="dt-copy-curl-btn" onClick={handleCopyCurl}>
          📋 Copy cURL
        </button>
      </div>

      {response && (
        <div className="dt-response-panel">
          <div className="dt-response-header">
            <div className="dt-response-status">
              <span className={`dt-response-code ${response.status >= 200 && response.status < 300 ? 'success' : 'error'}`}>
                {response.status === 0 ? 'ERR' : response.status}
              </span>
              <span className="dt-response-time">{response.time}ms</span>
              <span className="dt-response-size">{response.size}</span>
            </div>
          </div>
          <CodeBlock
            code={typeof response.body === 'string' ? response.body : JSON.stringify(response.body, null, 2)}
            language="json"
          />
        </div>
      )}
    </div>
  )
}

// ============================================================
// RouteCard Component (Accordion)
// ============================================================

function RouteCard({ endpoint }: { endpoint: ApiEndpoint }) {
  const [expanded, setExpanded] = useState(false)
  const [endpointStatus, setEndpointStatus] = useState<'unknown' | 'healthy' | 'error'>('unknown')

  const methodClass = METHOD_COLORS[endpoint.method] || 'get'
  const methodColor = METHOD_TEXT_COLORS[endpoint.method] || '#10b981'

  // Render path with highlighted params
  const renderPath = useCallback(() => {
    const parts = endpoint.path.split(/(\[[^\]]+\])/)
    return parts.map((part, i) => {
      if (part.startsWith('[') && part.endsWith(']')) {
        return <span key={i} className="dt-path-param">{part}</span>
      }
      return <span key={i}>{part}</span>
    })
  }, [endpoint.path])

  const hasBody = endpoint.method === 'POST' || endpoint.method === 'PUT'
  const hasParams = endpoint.parameters.length > 0
  const hasResponses = endpoint.responses.length > 0

  const sampleResponse = endpoint.responses.find(r => r.status >= 200 && r.status < 300) || endpoint.responses[0]

  return (
    <div className={`dt-route-card ${expanded ? 'expanded' : ''}`}>
      <div
        className="dt-route-header"
        onClick={() => setExpanded(!expanded)}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(!expanded) } }}
      >
        <span className={`dt-method-badge ${methodClass}`}>{endpoint.method}</span>
        <span className="dt-route-path">{renderPath()}</span>
        <span className="dt-route-desc">{endpoint.summary}</span>
        <span className={`dt-status-indicator ${endpointStatus}`}>
          {endpointStatus === 'healthy' ? '✓' : endpointStatus === 'error' ? '✗' : '○'}
        </span>
        <span className={`dt-expand-arrow ${expanded ? 'open' : ''}`}>›</span>
      </div>

      <div className={`dt-route-body ${expanded ? 'open' : ''}`}>
        <div className="dt-route-content">
          {/* Description */}
          <div className="dt-section-label">Description</div>
          <div className="dt-description-block">{endpoint.description}</div>

          {/* Parameters */}
          {hasParams && (
            <>
              <div className="dt-section-label">Parameters</div>
              <div style={{ overflowX: 'auto' }}>
                <table className="dt-params-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Required</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {endpoint.parameters.map((p, idx) => (
                      <tr key={idx}>
                        <td><span className="dt-param-name">{p.name}</span></td>
                        <td><span className="dt-param-type">{p.type}</span></td>
                        <td>
                          {p.required
                            ? <span className="dt-param-required">required</span>
                            : <span className="dt-param-optional">optional</span>
                          }
                        </td>
                        <td style={{ color: 'var(--dt-text-secondary)', fontSize: 12 }}>{p.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Request Body */}
          {hasBody && endpoint.bodyFields.length > 0 && (
            <>
              <div className="dt-section-label">Request Body</div>
              <div style={{ overflowX: 'auto' }}>
                <table className="dt-params-table">
                  <thead>
                    <tr>
                      <th>Field</th>
                      <th>Type</th>
                      <th>Required</th>
                      <th>Description</th>
                      <th>Default</th>
                    </tr>
                  </thead>
                  <tbody>
                    {endpoint.bodyFields.map((f, idx) => (
                      <tr key={idx}>
                        <td><span className="dt-param-name">{f.name}</span></td>
                        <td><span className="dt-param-type">{f.type}</span></td>
                        <td>
                          {f.required
                            ? <span className="dt-param-required">required</span>
                            : <span className="dt-param-optional">optional</span>
                          }
                        </td>
                        <td style={{ color: 'var(--dt-text-secondary)', fontSize: 12 }}>{f.description}</td>
                        <td style={{ color: 'var(--dt-text-muted)', fontSize: 12 }}>{f.default || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Response Schema */}
          {hasResponses && sampleResponse && (
            <>
              <div className="dt-section-label">Response ({sampleResponse.status})</div>
              <CodeBlock
                code={JSON.stringify(sampleResponse.body, null, 2)}
                language="json"
              />
            </>
          )}

          {/* Try It */}
          <div className="dt-section-label">Try It</div>
          <TryItPanel endpoint={endpoint} />
        </div>
      </div>
    </div>
  )
}

// ============================================================
// CategoryGroup Component
// ============================================================

function CategoryGroup({ category, filterText }: { category: ApiCategory; filterText: string }) {
  const filteredEndpoints = useMemo(() => {
    if (!filterText) return category.endpoints
    const q = filterText.toLowerCase()
    return category.endpoints.filter(ep =>
      ep.method.toLowerCase().includes(q) ||
      ep.path.toLowerCase().includes(q) ||
      ep.summary.toLowerCase().includes(q) ||
      ep.description.toLowerCase().includes(q)
    )
  }, [category.endpoints, filterText])

  if (filteredEndpoints.length === 0) return null

  return (
    <div className="dt-category-group">
      <div className="dt-category-header">
        <div
          className="dt-category-icon"
          style={{ background: `${category.color}15`, color: category.color }}
        >
          {category.name === 'Core' ? '⚡' :
           category.name === 'Agents' ? '🤖' :
           category.name === 'Meetings' ? '👥' :
           category.name === 'Analytics' ? '📊' :
           category.name === 'Pipelines' ? '🔀' :
           category.name === 'Export' ? '📥' :
           category.name === 'Notifications' ? '🔔' :
           category.name === 'Search' ? '🔍' :
           category.name === 'Research' ? '📝' :
           '⚙️'}
        </div>
        <span className="dt-category-title">{category.name}</span>
        <span className="dt-category-count">{filteredEndpoints.length}</span>
      </div>

      {filteredEndpoints.map((ep, idx) => (
        <div key={ep.id} className="dt-animate-fade-in" style={{ animationDelay: `${idx * 30}ms` }}>
          <RouteCard endpoint={ep} />
        </div>
      ))}
    </div>
  )
}

// ============================================================
// Main Component: ApiDocsGenerator
// ============================================================

export function ApiDocsGenerator() {
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [stats, setStats] = useState<DocsStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeMethodFilter, setActiveMethodFilter] = useState<string>('all')
  const [activeGroupBy, setActiveGroupBy] = useState<string>('all')

  // Fetch API docs
  useEffect(() => {
    async function fetchDocs() {
      try {
        const res = await fetch('/api/api-docs')
        if (!res.ok) throw new Error('Failed to fetch docs')
        const data = await res.json()
        setCategories(data.categories || [])
        setStats(data.stats || null)
      } catch (err) {
        console.error('Failed to load API docs:', err)
        toast.error('Failed to load API documentation')
      } finally {
        setLoading(false)
      }
    }
    fetchDocs()
  }, [])

  // Filter by method
  const filteredCategories = useMemo(() => {
    let cats = categories
    if (activeMethodFilter !== 'all') {
      cats = cats.map(cat => ({
        ...cat,
        endpoints: cat.endpoints.filter(ep =>
          ep.method.toUpperCase() === activeMethodFilter.toUpperCase()
        ),
      })).filter(cat => cat.endpoints.length > 0)
    }
    if (activeGroupBy !== 'all') {
      cats = cats.filter(cat => cat.name.toLowerCase() === activeGroupBy.toLowerCase())
    }
    return cats
  }, [categories, activeMethodFilter, activeGroupBy])

  const methods = ['GET', 'POST', 'PUT', 'DELETE']

  if (loading) {
    return (
      <div className="dt-docs-container">
        <div className="dt-shimmer" style={{ height: 36, width: 280, borderRadius: 8, marginBottom: 8 }} />
        <div className="dt-shimmer" style={{ height: 16, width: 400, borderRadius: 6, marginBottom: 24 }} />
        {[1, 2, 3].map(i => (
          <div key={i} className="dt-shimmer" style={{ height: 60, borderRadius: 10, marginBottom: 8 }} />
        ))}
      </div>
    )
  }

  return (
    <div className="dt-docs-container">
      {/* Header */}
      <header className="dt-docs-header">
        <h1 className="dt-docs-title">API Documentation</h1>
        <p className="dt-docs-subtitle">
          Complete reference for all Virtual Lab API endpoints. Explore, test, and integrate.
        </p>

        {stats && (
          <div className="dt-docs-stats">
            <div className="dt-docs-stat">
              <span className="dt-docs-stat-num">{stats.totalEndpoints}</span> endpoints
            </div>
            <div className="dt-docs-stat">
              <span className="dt-docs-stat-num">{stats.totalCategories}</span> categories
            </div>
            {methods.map(m => stats.methodCounts[m] > 0 && (
              <div key={m} className="dt-docs-stat" style={{ color: METHOD_TEXT_COLORS[m] }}>
                <span className="dt-docs-stat-num" style={{ color: METHOD_TEXT_COLORS[m] }}>
                  {stats.methodCounts[m]}
                </span> {m}
              </div>
            ))}
          </div>
        )}
      </header>

      {/* Search */}
      <div className="dt-search-bar">
        <span className="dt-search-icon">🔍</span>
        <input
          className="dt-search-input"
          placeholder="Search endpoints by method, path, or description..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Filters */}
      <div className="dt-filter-row">
        <div className="dt-method-filter">
          <button
            className={`dt-method-filter-btn ${activeMethodFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveMethodFilter('all')}
          >
            All
          </button>
          {methods.map(m => (
            <button
              key={m}
              className={`dt-method-filter-btn ${activeMethodFilter === m ? 'active' : ''}`}
              data-method={m}
              onClick={() => setActiveMethodFilter(activeMethodFilter === m ? 'all' : m)}
            >
              {m}
            </button>
          ))}
        </div>

        <select
          className="dt-group-select"
          value={activeGroupBy}
          onChange={e => setActiveGroupBy(e.target.value)}
        >
          <option value="all">All Categories</option>
          {categories.map(cat => (
            <option key={cat.name} value={cat.name.toLowerCase()}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Results count */}
      <div style={{ fontSize: 12, color: 'var(--dt-text-muted)', marginBottom: 16 }}>
        Showing {filteredCategories.reduce((s, c) => s + c.endpoints.length, 0)} of {stats?.totalEndpoints || 0} endpoints
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            style={{ marginLeft: 8, color: 'var(--dt-accent)', cursor: 'pointer', background: 'none', border: 'none', fontSize: 12 }}
          >
            ✕ Clear search
          </button>
        )}
      </div>

      {/* Category Groups */}
      {filteredCategories.map(cat => (
        <CategoryGroup
          key={cat.name}
          category={cat}
          filterText={searchQuery}
        />
      ))}

      {filteredCategories.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--dt-text-muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔎</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No endpoints found</div>
          <div style={{ fontSize: 13 }}>Try adjusting your search or filters</div>
        </div>
      )}

      {/* Footer */}
      <footer style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid var(--dt-border)', textAlign: 'center', color: 'var(--dt-text-muted)', fontSize: 12 }}>
        <p>
          Virtual Lab API Documentation · Auto-generated from route manifests
        </p>
        <p style={{ marginTop: 4, fontSize: 11 }}>
          {stats ? `${stats.totalEndpoints} endpoints across ${stats.totalCategories} categories` : ''}
        </p>
      </footer>
    </div>
  )
}
