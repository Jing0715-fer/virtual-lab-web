'use client'

import React, { useState, useMemo, useCallback } from 'react'
import {
  MessageSquare,
  Search,
  ChevronDown,
  ChevronRight,
  Clock,
  Users,
  Bookmark,
  BookmarkCheck,
  Download,
  BarChart3,
  Calendar,
  Filter,
  Send,
  ArrowUpRight,
} from 'lucide-react'

/* ─── Types ─── */
interface Reaction { emoji: string; count: number }

interface MessageData {
  id: string
  sender: string
  avatar_color: string
  content: string
  timestamp: string
  type: 'question' | 'answer' | 'follow-up' | 'decision' | 'data-point'
  sentiment: 'positive' | 'neutral' | 'negative'
  reactions: Reaction[]
}

interface Participant {
  name: string
  avatar_color: string
}

interface ConversationData {
  id: string
  title: string
  date: string
  date_group: string
  participants: Participant[]
  message_count: number
  last_message: string
  unread: number
  messages: MessageData[]
}

/* ─── Helper: simple markdown-like rendering ─── */
function renderContent(raw: string): React.ReactNode[] {
  const blocks = raw.split('\n')
  const elements: React.ReactNode[] = []
  let inCodeBlock = false
  let codeLines: string[] = []
  let inList = false

  blocks.forEach((block, bi) => {
    const trimmed = block.trim()

    // Toggle code block
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <div key={`code-${bi}`} className="ch-msg-code-block">
            {codeLines.join('\n')}
          </div>
        )
        codeLines = []
        inCodeBlock = false
      } else {
        if (inList) {
          elements.push(<span key={`list-end-${bi}`} />)
          inList = false
        }
        inCodeBlock = true
      }
      return
    }

    if (inCodeBlock) {
      codeLines.push(block)
      return
    }

    // Close list if not a list item
    if (inList && !trimmed.startsWith('- ') && !trimmed.match(/^\d+\.\s/)) {
      inList = false
    }

    // List items
    if (trimmed.startsWith('- ') || trimmed.match(/^\d+\.\s/)) {
      if (!inList) {
        elements.push(<ul key={`ul-${bi}`} className="ch-msg-list" />)
        inList = true
      }
      elements.push(
        <li key={`li-${bi}`} style={{ listStyle: trimmed.startsWith('- ') ? 'disc' : 'decimal' }}>
          {renderInline(trimmed.replace(/^[-\d.]\s/, ''))}
        </li>
      )
      return
    }

    if (trimmed === '') return

    elements.push(
      <div key={`p-${bi}`} style={{ marginBottom: 4 }}>
        {renderInline(block)}
      </div>
    )
  })

  return elements
}

function renderInline(text: string): React.ReactNode {
  // Process bold, italic, code
  const parts: React.ReactNode[] = []
  let remaining = text
  let keyIdx = 0

  while (remaining.length > 0) {
    // Bold: **text**
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/)
    // Italic: *text*
    const italicMatch = remaining.match(/(?<!\*)\*([^*]+?)\*(?!\*)/)
    // Inline code: `text`
    const codeMatch = remaining.match(/`([^`]+)`/)

    let firstMatch: { index: number; length: number; node: React.ReactNode } | null = null

    if (boldMatch && boldMatch.index !== undefined && (firstMatch === null || boldMatch.index < firstMatch.index)) {
      firstMatch = { index: boldMatch.index, length: boldMatch[0].length, node: <strong key={`b${keyIdx++}`}>{boldMatch[1]}</strong> }
    }
    if (codeMatch && codeMatch.index !== undefined && (firstMatch === null || codeMatch.index < firstMatch.index)) {
      firstMatch = { index: codeMatch.index, length: codeMatch[0].length, node: <code key={`c${keyIdx++}`} style={{ background: 'var(--ch-bg-code)', padding: '1px 5px', borderRadius: 3, fontSize: '0.9em' }}>{codeMatch[1]}</code> }
    }
    if (italicMatch && italicMatch.index !== undefined && !boldMatch?.[0]?.includes(italicMatch[0]) && (firstMatch === null || italicMatch.index < firstMatch.index)) {
      firstMatch = { index: italicMatch.index, length: italicMatch[0].length, node: <em key={`i${keyIdx++}`}>{italicMatch[1]}</em> }
    }

    if (firstMatch) {
      if (firstMatch.index > 0) {
        parts.push(remaining.substring(0, firstMatch.index))
      }
      parts.push(firstMatch.node)
      remaining = remaining.substring(firstMatch.index + firstMatch.length)
    } else {
      parts.push(remaining)
      remaining = ''
    }
  }

  return <>{parts}</>
}

/* ─── Message Component ─── */
function MessageBubble({ msg, isBookmarked, onBookmark }: { msg: MessageData; isBookmarked: boolean; onBookmark: (id: string) => void }) {
  const initial = msg.sender.charAt(0).toUpperCase()

  return (
    <div className="ch-message">
      <div className="ch-msg-avatar" style={{ background: msg.avatar_color }}>
        {initial}
      </div>
      <div className="ch-msg-body">
        <div className="ch-msg-header">
          <span className="ch-msg-sender">{msg.sender}</span>
          <span className="ch-msg-time">{msg.timestamp}</span>
          <span className={`ch-msg-type-badge ${msg.type}`}>
            {msg.type.replace('-', ' ')}
          </span>
          <span className={`ch-msg-sentiment ${msg.sentiment}`}>
            {msg.sentiment === 'positive' ? '▲' : msg.sentiment === 'negative' ? '▼' : '●'}
          </span>
        </div>
        <div className="ch-msg-content">
          {renderContent(msg.content)}
        </div>
        {msg.reactions.length > 0 && (
          <div className="ch-msg-reactions">
            {msg.reactions.map(r => (
              <span key={r.emoji} className="ch-reaction">
                {r.emoji} <span className="ch-reaction-count">{r.count}</span>
              </span>
            ))}
          </div>
        )}
      </div>
      <button className={`ch-msg-bookmark ${isBookmarked ? 'bookmarked' : ''}`} onClick={() => onBookmark(msg.id)} title="Bookmark">
        {isBookmarked ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
      </button>
    </div>
  )
}

/* ─── Analytics Panel ─── */
function AnalyticsPanel({ messages, participants }: { messages: MessageData[]; participants: Participant[] }) {
  const msgCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    messages.forEach(m => {
      counts[m.sender] = (counts[m.sender] || 0) + 1
    })
    return counts
  }, [messages])

  const maxCount = useMemo(() => Math.max(...Object.values(msgCounts), 1), [msgCounts])
  const barColors = useMemo(() => {
    const map: Record<string, string> = {}
    participants.forEach(p => { map[p.name] = p.avatar_color })
    return map
  }, [participants])

  const topics = useMemo(() => {
    const words = new Set<string>()
    messages.forEach(m => {
      const tokens = m.content.toLowerCase().split(/\W+/)
      tokens.forEach(t => {
        if (t.length > 5 && !['should', 'about', 'their', 'which', 'would', 'could', 'these', 'those'].includes(t)) {
          words.add(t)
        }
      })
    })
    return Array.from(words).slice(0, 8)
  }, [messages])

  return (
    <div className="ch-analytics-panel">
      <div className="ch-analytics-grid" style={{ padding: '0 20px 16px' }}>
        {/* Messages per participant */}
        <div className="ch-analytics-card">
          <div className="ch-analytics-card-title">Messages per Participant</div>
          <div className="ch-bar-chart">
            {Object.entries(msgCounts).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
              <div key={name} className="ch-bar-row">
                <span className="ch-bar-label">{name.split(' ').slice(-1)[0]}</span>
                <div className="ch-bar-track">
                  <div className="ch-bar-fill" style={{ width: `${(count / maxCount) * 100}%`, background: barColors[name] || 'var(--ch-accent)' }} />
                </div>
                <span className="ch-bar-count">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Response time + Topics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="ch-analytics-card">
            <div className="ch-analytics-card-title">Avg Response Time</div>
            <div className="ch-response-time">
              <span className="ch-response-time-value">2.4s</span>
              <span className="ch-response-time-label">between messages</span>
            </div>
          </div>
          <div className="ch-analytics-card" style={{ flex: 1 }}>
            <div className="ch-analytics-card-title">Topic Tags</div>
            <div className="ch-topic-tags">
              {topics.map(t => (
                <span key={t} className="ch-topic-tag">{t}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Conversation List Item ─── */
function ConversationItem({ conv, isActive, onClick }: { conv: ConversationData; isActive: boolean; onClick: () => void }) {
  const dateObj = new Date(conv.date)
  const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div className={`ch-conv-item ${isActive ? 'active' : ''}`} onClick={onClick}>
      <div className="ch-conv-icon" style={{ background: `linear-gradient(135deg, ${conv.participants[0]?.avatar_color || 'var(--ch-accent)'}, ${conv.participants[1]?.avatar_color || '#06b6d4'})` }}>
        <MessageSquare size={18} style={{ color: '#fff' }} />
      </div>
      <div className="ch-conv-info">
        <div className="ch-conv-title">{conv.title}</div>
        <div className="ch-conv-preview">{conv.last_message}</div>
        <div className="ch-conv-meta">
          <span className="ch-conv-meta-item">
            <Users size={11} /> {conv.participants.length}
          </span>
          <span className="ch-conv-meta-item">
            <MessageSquare size={11} /> {conv.message_count}
          </span>
        </div>
      </div>
      <div className="ch-conv-time">{timeStr}</div>
      {conv.unread > 0 && <div className="ch-conv-unread">{conv.unread}</div>}
    </div>
  )
}

/* ─── Main Page ─── */
export default function ChatHistoryPage() {
  const [conversations, setConversations] = useState<ConversationData[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [agentFilter, setAgentFilter] = useState('all')
  const [dateRange, setDateRange] = useState({ from: '', to: '' })
  const [analyticsOpen, setAnalyticsOpen] = useState(false)
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set())

  // Fetch conversations on mount
  React.useEffect(() => {
    fetch('/api/chat-history')
      .then(res => res.json())
      .then(data => {
        if (data?.conversations) {
          setConversations(data.conversations as ConversationData[])
          if (data.conversations.length > 0) {
            setSelectedId(data.conversations[0].id)
          }
        }
      })
      .catch(() => { /* fallback — conversations stays empty */ })
  }, [])

  const selectedConv = useMemo(() => {
    return conversations.find(c => c.id === selectedId) || null
  }, [conversations, selectedId])

  const filteredConvs = useMemo(() => {
    return conversations.filter(conv => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!conv.title.toLowerCase().includes(q) && !conv.last_message.toLowerCase().includes(q)) return false
      }
      if (agentFilter !== 'all') {
        if (!conv.participants.some(p => p.name.toLowerCase().includes(agentFilter.toLowerCase()))) return false
      }
      return true
    })
  }, [conversations, searchQuery, agentFilter])

  const groupedConvs = useMemo(() => {
    const groups: Record<string, ConversationData[]> = {}
    const order = ['Today', 'Yesterday', 'This Week', 'Earlier']
    filteredConvs.forEach(c => {
      const group = c.date_group || 'Earlier'
      if (!groups[group]) groups[group] = []
      groups[group].push(c)
    })
    return order.filter(g => groups[g]).map(g => ({ label: g, items: groups[g] }))
  }, [filteredConvs])

  const toggleBookmark = useCallback((msgId: string) => {
    setBookmarks(prev => {
      const next = new Set(prev)
      if (next.has(msgId)) next.delete(msgId)
      else next.add(msgId)
      return next
    })
  }, [])

  const handleExport = useCallback(() => {
    if (!selectedConv) return
    const blob = new Blob([JSON.stringify(selectedConv, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedConv.title.replace(/\s+/g, '-').toLowerCase()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [selectedConv])

  const allParticipants = useMemo(() => {
    const seen = new Set<string>()
    const result: Participant[] = []
    conversations.forEach(c => {
      c.participants.forEach(p => {
        if (!seen.has(p.name)) {
          seen.add(p.name)
          result.push(p)
        }
      })
    })
    return result
  }, [conversations])

  return (
    <div className="ch-container">
      {/* Top Bar */}
      <div className="ch-top-bar">
        <div className="ch-logo-area">
          <div className="ch-logo-icon"><MessageSquare size={18} /></div>
          <span className="ch-logo-text">Chat History</span>
        </div>
        <div className="ch-search-bar">
          <Search size={14} className="ch-search-icon" />
          <input
            className="ch-search-input"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <select className="ch-agent-filter" value={agentFilter} onChange={e => setAgentFilter(e.target.value)}>
          <option value="all">All Participants</option>
          {allParticipants.map(p => (
            <option key={p.name} value={p.name}>{p.name}</option>
          ))}
        </select>
        <div className="ch-date-range">
          <Calendar size={14} />
          <input type="date" className="ch-date-input" value={dateRange.from} onChange={e => setDateRange(prev => ({ ...prev, from: e.target.value }))} />
          <span>→</span>
          <input type="date" className="ch-date-input" value={dateRange.to} onChange={e => setDateRange(prev => ({ ...prev, to: e.target.value }))} />
        </div>
      </div>

      {/* Main Content */}
      <div className="ch-main">
        {/* Conversation List */}
        <div className="ch-list-panel">
          <div className="ch-list-scroll">
            {groupedConvs.map(group => (
              <div key={group.label}>
                <div className="ch-date-group-label">{group.label}</div>
                {group.items.map(conv => (
                  <ConversationItem
                    key={conv.id}
                    conv={conv}
                    isActive={conv.id === selectedId}
                    onClick={() => {
                      setSelectedId(conv.id)
                      setAnalyticsOpen(false)
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Conversation Detail */}
        <div className="ch-detail-panel">
          {selectedConv ? (
            <>
              {/* Header */}
              <div className="ch-detail-header">
                <div className="ch-detail-title-row">
                  <h2 className="ch-detail-title">{selectedConv.title}</h2>
                  <div className="ch-detail-actions">
                    <button className="ch-detail-btn" onClick={() => setAnalyticsOpen(prev => !prev)}>
                      <BarChart3 size={12} /> Analytics
                    </button>
                    <button className="ch-detail-btn primary" onClick={handleExport}>
                      <Download size={12} /> Export
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="ch-detail-participants">
                    {selectedConv.participants.map(p => (
                      <div
                        key={p.name}
                        className="ch-participant-avatar"
                        style={{ background: p.avatar_color }}
                        title={p.name}
                      >
                        {p.name.charAt(0)}
                      </div>
                    ))}
                  </div>
                  <span className="ch-detail-date">
                    <Clock size={11} /> {new Date(selectedConv.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {/* Messages */}
              <div className="ch-messages-scroll">
                {selectedConv.messages.map(msg => (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    isBookmarked={bookmarks.has(msg.id)}
                    onBookmark={toggleBookmark}
                  />
                ))}
              </div>

              {/* Analytics */}
              {analyticsOpen && (
                <AnalyticsPanel messages={selectedConv.messages} participants={selectedConv.participants} />
              )}

              {/* Analytics Toggle (if closed) */}
              {!analyticsOpen && (
                <button className="ch-analytics-toggle" onClick={() => setAnalyticsOpen(true)}>
                  <BarChart3 size={14} />
                  Show Conversation Analytics
                  <ChevronRight size={14} />
                </button>
              )}

              {/* Input (read-only) */}
              <div className="ch-msg-input-area">
                <div className="ch-msg-input-row">
                  <textarea className="ch-msg-input" placeholder="Messages are read-only. Click Reply to respond..." readOnly rows={1} />
                  <button className="ch-reply-btn">
                    <Send size={13} /> Reply
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="ch-empty-detail">
              <div className="ch-empty-icon"><MessageSquare size={48} /></div>
              <div className="ch-empty-text">Select a conversation</div>
              <div className="ch-empty-sub">Choose a conversation from the list to view messages</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
