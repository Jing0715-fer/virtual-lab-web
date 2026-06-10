'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Star, MessageSquarePlus, ChevronDown, ChevronUp, Users, Calendar,
  Search, Filter, Download, Trash2, CheckSquare, Square, Eye, EyeOff,
  Plus, X, Flag, Clock, Target, Lightbulb, BarChart3, TrendingUp,
  Award, AlertTriangle, FileText, ArrowUpDown,
} from 'lucide-react'

// ============================================================
// Types
// ============================================================

interface ReviewTakeaway {
  id: string
  text: string
  priority: 'High' | 'Medium' | 'Low'
}

interface ReviewActionItem {
  id: string
  text: string
  assignee: string
  dueDate: string
  status: 'Todo' | 'In Progress' | 'Done'
}

interface ReviewHighlight {
  id: string
  text: string
  timestamp: string
}

interface CategoryRatings {
  discussionQuality: number
  relevanceToGoal: number
  actionableOutcomes: number
  agentPerformance: number
  timeEfficiency: number
}

interface MeetingReview {
  id: string
  meetingId: string
  meetingTitle: string
  meetingType: 'team' | 'individual'
  meetingDate: string
  participants: string[]
  overallRating: number
  categoryRatings: CategoryRatings
  feedback: string
  takeaways: ReviewTakeaway[]
  actionItems: ReviewActionItem[]
  highlights: ReviewHighlight[]
  suggestions: string
  anonymous: boolean
  reviewerName: string
  reviewedAt: string
  createdAt: string
  updatedAt: string
}

interface UnreviewedMeeting {
  id: string
  title: string
  type: 'team' | 'individual'
  date: string
  participants: string[]
}

// ============================================================
// Constants
// ============================================================

const STORAGE_KEY = 'vl-meeting-reviews'

const RATING_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Below Average',
  3: 'Average',
  4: 'Good',
  5: 'Excellent',
}

const CATEGORY_LABELS: Record<keyof CategoryRatings, string> = {
  discussionQuality: 'Discussion Quality',
  relevanceToGoal: 'Relevance to Goal',
  actionableOutcomes: 'Actionable Outcomes',
  agentPerformance: 'Agent Performance',
  timeEfficiency: 'Time Efficiency',
}

const AGENT_COLORS: Record<string, string> = {
  'Dr. Chen': '#10b981',
  'Prof. Park': '#06b6d4',
  'Dr. Yamamoto': '#8b5cf6',
  'Dr. Kim': '#f59e0b',
  'Dr. Singh': '#ec4899',
}

const SAMPLE_UNREVIEWED: UnreviewedMeeting[] = [
  { id: 'mtg-pending-1', title: 'Quantum Computing Simulation Review', type: 'team', date: new Date().toISOString(), participants: ['Dr. Chen', 'Prof. Park'] },
  { id: 'mtg-pending-2', title: 'Epigenetics Research Planning', type: 'individual', date: new Date(Date.now() - 86400000).toISOString(), participants: ['Dr. Yamamoto'] },
  { id: 'mtg-pending-3', title: 'Bioethics Committee Session', type: 'team', date: new Date(Date.now() - 172800000).toISOString(), participants: ['Dr. Kim', 'Dr. Singh', 'Dr. Chen'] },
]

// ============================================================
// Helpers
// ============================================================

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function formatDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getAgentInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

function getAgentColor(name: string): string {
  return AGENT_COLORS[name] || '#6b7280'
}

// ============================================================
// Star Rating Component
// ============================================================

function StarRating({
  value,
  onChange,
  size = 20,
  interactive = false,
  showLabel = false,
}: {
  value: number
  onChange?: (v: number) => void
  size?: number
  interactive?: boolean
  showLabel?: boolean
}) {
  const [hoverVal, setHoverVal] = useState(0)
  const displayVal = hoverVal || value

  return (
    <div className="flex items-center gap-1">
      <div className={`review-stars ${interactive ? 'review-stars--interactive' : ''}`}>
        {[1, 2, 3, 4, 5].map(star => (
          <span
            key={star}
            className={`review-star ${displayVal >= star ? 'review-star--filled' : ''}`}
            onMouseEnter={() => interactive && setHoverVal(star)}
            onMouseLeave={() => interactive && setHoverVal(0)}
            onClick={() => interactive && onChange?.(star)}
            role={interactive ? 'button' : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}>
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </span>
        ))}
      </div>
      {showLabel && (
        <span className="review-stars-label">{RATING_LABELS[displayVal] || ''}</span>
      )}
    </div>
  )
}

// ============================================================
// Review Card Component
// ============================================================

function ReviewCardView({
  review,
  expanded,
  onToggle,
  selected,
  onSelect,
  index,
}: {
  review: MeetingReview
  expanded: boolean
  onToggle: () => void
  selected: boolean
  onSelect: () => void
  index: number
}) {
  return (
    <div
      className={`review-card review-card--rating-${review.overallRating}`}
      style={{ animationDelay: `${index * 0.06}s` }}
    >
      <div className="flex items-start gap-3">
        <div
          className={`review-checkbox ${selected ? 'review-checkbox--checked' : ''}`}
          onClick={onSelect}
          role="checkbox"
          aria-checked={selected}
          tabIndex={0}
        >
          {selected && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} width={10} height={10}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="review-card-header">
            <div>
              <div className="review-card-title">{review.meetingTitle}</div>
              <div className="review-card-meta">
                <span className="review-card-date">{formatDate(review.meetingDate)}</span>
                <span className="review-card-type-badge">
                  <Users size={10} />
                  {review.meetingType}
                </span>
                <span className="review-card-status review-card-status--completed">
                  <Eye size={10} />
                  Reviewed
                </span>
              </div>
            </div>
            <StarRating value={review.overallRating} size={18} />
          </div>

          <div className="review-card-participants">
            {review.participants.slice(0, 4).map((p, pi) => (
              <div
                key={pi}
                className="review-card-avatar"
                style={{ background: getAgentColor(p), zIndex: 4 - pi }}
                title={p}
              >
                {getAgentInitials(p)}
              </div>
            ))}
            {review.participants.length > 4 && (
              <span className="text-[10px] vl-text-muted ml-1">+{review.participants.length - 4}</span>
            )}
          </div>

          <div className={`review-card-body ${expanded ? 'review-card-body--expanded' : ''}`}>
            {expanded && (
              <>
                <p className="mb-3">{review.feedback}</p>

                <div className="mb-3">
                  <div className="text-[10px] font-semibold vl-text-muted uppercase tracking-wider mb-2">Category Ratings</div>
                  {(Object.keys(CATEGORY_LABELS) as Array<keyof CategoryRatings>).map(cat => (
                    <div key={cat} className="review-category-rating">
                      <span className="review-category-label">{CATEGORY_LABELS[cat]}</span>
                      <StarRating value={review.categoryRatings[cat]} size={14} />
                    </div>
                  ))}
                </div>

                {review.takeaways.length > 0 && (
                  <div className="mb-3">
                    <div className="text-[10px] font-semibold vl-text-muted uppercase tracking-wider mb-2">Key Takeaways</div>
                    {review.takeaways.map(t => (
                      <div key={t.id} className="review-takeaway">
                        <Flag size={12} className="flex-shrink-0 mt-0.5" style={{ color: t.priority === 'High' ? '#ef4444' : t.priority === 'Medium' ? '#f59e0b' : '#10b981' }} />
                        <span className="review-takeaway-text">{t.text}</span>
                        <span className={`review-takeaway-priority review-takeaway-priority--${t.priority.toLowerCase()}`}>{t.priority}</span>
                      </div>
                    ))}
                  </div>
                )}

                {review.actionItems.length > 0 && (
                  <div className="mb-3">
                    <div className="text-[10px] font-semibold vl-text-muted uppercase tracking-wider mb-2">Action Items</div>
                    {review.actionItems.map(a => (
                      <div key={a.id} className="review-action-item">
                        <div className="review-action-item-content">
                          <div className="review-action-item-text">{a.text}</div>
                          <div className="review-action-item-meta">
                            <span className="review-action-item-assignee">
                              <span className="review-action-item-assignee-avatar" style={{ background: getAgentColor(a.assignee) }}>
                                {getAgentInitials(a.assignee)}
                              </span>
                              {a.assignee}
                            </span>
                            <span className="review-action-item-due">
                              <Clock size={10} />
                              {a.dueDate}
                            </span>
                          </div>
                        </div>
                        <span className={`review-action-item-status review-action-item-status--${a.status.toLowerCase().replace(' ', '-')}`}>
                          {a.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {review.highlights.length > 0 && (
                  <div className="mb-3">
                    <div className="text-[10px] font-semibold vl-text-muted uppercase tracking-wider mb-2">Highlights</div>
                    {review.highlights.map(h => (
                      <div key={h.id} className="review-highlight">
                        <Lightbulb size={14} className="review-highlight-icon" />
                        <div>
                          <div className="review-highlight-text">{h.text}</div>
                          <div className="review-highlight-timestamp">@ {h.timestamp}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {review.suggestions && (
                  <div className="mt-2 p-2 rounded-lg" style={{ background: 'var(--vl-bg-secondary)', fontSize: 12, color: 'var(--vl-text-secondary)' }}>
                    <strong>Suggestions:</strong> {review.suggestions}
                  </div>
                )}

                <div className="mt-3 text-[10px] vl-text-muted">
                  Reviewed by {review.reviewerName} on {formatDate(review.reviewedAt)}
                </div>
              </>
            )}
          </div>

          <div className="review-card-footer">
            <span className="text-[11px] vl-text-muted">by {review.reviewerName}</span>
            <button
              onClick={onToggle}
              className="flex items-center gap-1 text-[11px] font-medium"
              style={{ color: 'var(--vl-accent)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              {expanded ? 'Less' : 'Details'}
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Review Form Component
// ============================================================

function ReviewForm({
  meeting,
  agents,
  onSubmit,
  onCancel,
}: {
  meeting: UnreviewedMeeting
  agents: string[]
  onSubmit: (review: Omit<MeetingReview, 'id' | 'createdAt' | 'updatedAt'>) => void
  onCancel: () => void
}) {
  const [overallRating, setOverallRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [categoryRatings, setCategoryRatings] = useState<CategoryRatings>({
    discussionQuality: 0,
    relevanceToGoal: 0,
    actionableOutcomes: 0,
    agentPerformance: 0,
    timeEfficiency: 0,
  })
  const [feedback, setFeedback] = useState('')
  const [takeaways, setTakeaways] = useState<ReviewTakeaway[]>([])
  const [newTakeawayText, setNewTakeawayText] = useState('')
  const [newTakeawayPriority, setNewTakeawayPriority] = useState<'High' | 'Medium' | 'Low'>('Medium')
  const [actionItems, setActionItems] = useState<ReviewActionItem[]>([])
  const [newActionText, setNewActionText] = useState('')
  const [newActionAssignee, setNewActionAssignee] = useState(agents[0] || '')
  const [newActionDue, setNewActionDue] = useState('')
  const [highlights, setHighlights] = useState<ReviewHighlight[]>([])
  const [newHighlightText, setNewHighlightText] = useState('')
  const [newHighlightTimestamp, setNewHighlightTimestamp] = useState('')
  const [suggestions, setSuggestions] = useState('')
  const [anonymous, setAnonymous] = useState(false)

  const handleCategoryChange = useCallback((key: keyof CategoryRatings, val: number) => {
    setCategoryRatings(prev => ({ ...prev, [key]: val }))
  }, [])

  const addTakeaway = useCallback(() => {
    if (!newTakeawayText.trim()) return
    setTakeaways(prev => [...prev, { id: generateId('tk'), text: newTakeawayText.trim(), priority: newTakeawayPriority }])
    setNewTakeawayText('')
  }, [newTakeawayText, newTakeawayPriority])

  const removeTakeaway = useCallback((id: string) => {
    setTakeaways(prev => prev.filter(t => t.id !== id))
  }, [])

  const addActionItem = useCallback(() => {
    if (!newActionText.trim()) return
    setActionItems(prev => [...prev, {
      id: generateId('act'),
      text: newActionText.trim(),
      assignee: newActionAssignee,
      dueDate: newActionDue || new Date().toISOString().split('T')[0],
      status: 'Todo',
    }])
    setNewActionText('')
  }, [newActionText, newActionAssignee, newActionDue])

  const removeActionItem = useCallback((id: string) => {
    setActionItems(prev => prev.filter(a => a.id !== id))
  }, [])

  const addHighlight = useCallback(() => {
    if (!newHighlightText.trim()) return
    setHighlights(prev => [...prev, {
      id: generateId('hl'),
      text: newHighlightText.trim(),
      timestamp: newHighlightTimestamp || '00:00',
    }])
    setNewHighlightText('')
    setNewHighlightTimestamp('')
  }, [newHighlightText, newHighlightTimestamp])

  const removeHighlight = useCallback((id: string) => {
    setHighlights(prev => prev.filter(h => h.id !== id))
  }, [])

  const handleSubmit = useCallback(() => {
    if (overallRating === 0) return
    onSubmit({
      meetingId: meeting.id,
      meetingTitle: meeting.title,
      meetingType: meeting.type,
      meetingDate: meeting.date,
      participants: meeting.participants,
      overallRating,
      categoryRatings,
      feedback,
      takeaways,
      actionItems,
      highlights,
      suggestions,
      anonymous,
      reviewerName: anonymous ? 'Anonymous' : meeting.participants[0] || 'Unknown',
      reviewedAt: new Date().toISOString(),
    })
  }, [overallRating, categoryRatings, feedback, takeaways, actionItems, highlights, suggestions, anonymous, meeting, onSubmit])

  return (
    <div className="review-form">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold" style={{ color: 'var(--vl-text-heading)' }}>
          Review: {meeting.title}
        </h3>
        <button
          onClick={onCancel}
          className="flex items-center gap-1 text-xs"
          style={{ background: 'none', border: 'none', color: 'var(--vl-text-muted)', cursor: 'pointer' }}
        >
          <X size={14} /> Cancel
        </button>
      </div>

      {/* Overall Rating */}
      <div className="review-form-section">
        <div className="review-form-section-title">
          <Star size={16} /> Overall Rating
        </div>
        <div className="flex items-center gap-3">
          <div
            className="review-stars review-stars--interactive"
            onMouseLeave={() => setHoverRating(0)}
          >
            {[1, 2, 3, 4, 5].map(star => (
              <span
                key={star}
                className={`review-star ${(hoverRating || overallRating) >= star ? 'review-star--filled' : ''}`}
                onMouseEnter={() => setHoverRating(star)}
                onClick={() => setOverallRating(star)}
                role="button"
                tabIndex={0}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width={28} height={28}>
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </span>
            ))}
          </div>
          {overallRating > 0 && (
            <span className="review-stars-label" style={{ fontSize: 13 }}>
              {RATING_LABELS[overallRating]}
            </span>
          )}
        </div>
      </div>

      {/* Category Ratings */}
      <div className="review-form-section">
        <div className="review-form-section-title">
          <BarChart3 size={16} /> Category Ratings
        </div>
        {(Object.keys(CATEGORY_LABELS) as Array<keyof CategoryRatings>).map(cat => (
          <div key={cat} className="review-category-rating">
            <span className="review-category-label">{CATEGORY_LABELS[cat]}</span>
            <StarRating
              value={categoryRatings[cat]}
              onChange={v => handleCategoryChange(cat, v)}
              size={16}
              interactive
            />
          </div>
        ))}
      </div>

      {/* Text Feedback */}
      <div className="review-form-section">
        <div className="review-form-section-title">
          <MessageSquarePlus size={16} /> Feedback
        </div>
        <textarea
          className="review-textarea"
          placeholder="Share your detailed review of this meeting..."
          value={feedback}
          onChange={e => setFeedback(e.target.value)}
          maxLength={2000}
          rows={4}
        />
        <div className="review-textarea-count">{feedback.length}/2000</div>
      </div>

      {/* Key Takeaways */}
      <div className="review-form-section">
        <div className="review-form-section-title">
          <Target size={16} /> Key Takeaways
        </div>
        {takeaways.map(t => (
          <div key={t.id} className="review-takeaway">
            <Flag size={12} className="flex-shrink-0 mt-0.5" style={{ color: t.priority === 'High' ? '#ef4444' : t.priority === 'Medium' ? '#f59e0b' : '#10b981' }} />
            <span className="review-takeaway-text">{t.text}</span>
            <span className={`review-takeaway-priority review-takeaway-priority--${t.priority.toLowerCase()}`}>{t.priority}</span>
            <button className="review-takeaway-remove" onClick={() => removeTakeaway(t.id)}>
              <X size={12} />
            </button>
          </div>
        ))}
        <div className="review-add-row">
          <input
            className="review-input"
            placeholder="Add a takeaway..."
            value={newTakeawayText}
            onChange={e => setNewTakeawayText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTakeaway()}
          />
          <select
            className="review-select"
            value={newTakeawayPriority}
            onChange={e => setNewTakeawayPriority(e.target.value as 'High' | 'Medium' | 'Low')}
          >
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
          <button className="review-add-btn" onClick={addTakeaway}>
            <Plus size={12} /> Add
          </button>
        </div>
      </div>

      {/* Action Items */}
      <div className="review-form-section">
        <div className="review-form-section-title">
          <Clock size={16} /> Action Items
        </div>
        {actionItems.map(a => (
          <div key={a.id} className="review-action-item">
            <div className="review-action-item-content">
              <div className="review-action-item-text">{a.text}</div>
              <div className="review-action-item-meta">
                <span className="review-action-item-assignee">
                  <span className="review-action-item-assignee-avatar" style={{ background: getAgentColor(a.assignee) }}>
                    {getAgentInitials(a.assignee)}
                  </span>
                  {a.assignee}
                </span>
                <span className="review-action-item-due">
                  <Clock size={10} /> {a.dueDate}
                </span>
                <span className={`review-action-item-status review-action-item-status--${a.status.toLowerCase().replace(' ', '-')}`}>{a.status}</span>
              </div>
            </div>
            <button className="review-takeaway-remove" onClick={() => removeActionItem(a.id)}>
              <X size={12} />
            </button>
          </div>
        ))}
        <div className="review-add-row">
          <input
            className="review-input"
            placeholder="Action item..."
            value={newActionText}
            onChange={e => setNewActionText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addActionItem()}
          />
          <select className="review-select" value={newActionAssignee} onChange={e => setNewActionAssignee(e.target.value)}>
            {agents.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <input
            className="review-input"
            type="date"
            value={newActionDue}
            onChange={e => setNewActionDue(e.target.value)}
            style={{ maxWidth: 140 }}
          />
          <button className="review-add-btn" onClick={addActionItem}>
            <Plus size={12} /> Add
          </button>
        </div>
      </div>

      {/* Highlights */}
      <div className="review-form-section">
        <div className="review-form-section-title">
          <Lightbulb size={16} /> Highlights
        </div>
        {highlights.map(h => (
          <div key={h.id} className="review-highlight">
            <Lightbulb size={14} className="review-highlight-icon" />
            <div>
              <div className="review-highlight-text">{h.text}</div>
              <div className="review-highlight-timestamp">@ {h.timestamp}</div>
            </div>
            <button className="review-highlight-remove" onClick={() => removeHighlight(h.id)}>
              <X size={12} />
            </button>
          </div>
        ))}
        <div className="review-add-row">
          <input
            className="review-input"
            placeholder="Best moment..."
            value={newHighlightText}
            onChange={e => setNewHighlightText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addHighlight()}
          />
          <input
            className="review-input"
            placeholder="00:00"
            value={newHighlightTimestamp}
            onChange={e => setNewHighlightTimestamp(e.target.value)}
            style={{ maxWidth: 90 }}
          />
          <button className="review-add-btn" onClick={addHighlight}>
            <Plus size={12} /> Add
          </button>
        </div>
      </div>

      {/* Suggestions */}
      <div className="review-form-section">
        <div className="review-form-section-title">
          <TrendingUp size={16} /> Suggestions for Next Time
        </div>
        <textarea
          className="review-textarea"
          placeholder="How can this meeting be improved?"
          value={suggestions}
          onChange={e => setSuggestions(e.target.value)}
          maxLength={1000}
          rows={2}
        />
        <div className="review-textarea-count">{suggestions.length}/1000</div>
      </div>

      {/* Anonymous Toggle */}
      <div className="review-anonymous-toggle" onClick={() => setAnonymous(prev => !prev)}>
        {anonymous ? <EyeOff size={16} /> : <Eye size={16} />}
        <span className="review-anonymous-toggle-label">
          Submit anonymously: {anonymous ? 'Yes' : 'No'}
        </span>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3 mt-2">
        <button
          className="review-submit-btn"
          onClick={handleSubmit}
          disabled={overallRating === 0}
        >
          <CheckSquare size={14} /> Submit Review
        </button>
        <button
          className="review-add-btn"
          onClick={onCancel}
          style={{ padding: '10px 20px' }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ============================================================
// Review Summary Dashboard
// ============================================================

function ReviewSummaryDashboard({
  reviews,
  stats,
}: {
  reviews: MeetingReview[]
  stats: {
    totalReviews: number
    avgRating: number
    distribution: Record<number, number>
    categoryAverages: Record<string, number>
    topRated: { id: string; meetingTitle: string; rating: number; type: string }[]
    lowestRated: { id: string; meetingTitle: string; rating: number; type: string }[]
    trendData: { date: string; rating: number }[]
  }
}) {
  const maxDist = Math.max(...Object.values(stats.distribution), 1)

  const sparkPoints = useMemo(() => {
    if (stats.trendData.length < 2) return ''
    const w = 240
    const h = 50
    const pad = 4
    const stepX = (w - pad * 2) / (stats.trendData.length - 1)
    return stats.trendData.map((d, i) => {
      const x = pad + i * stepX
      const y = pad + (h - pad * 2) - ((d.rating - 1) / 4) * (h - pad * 2)
      return `${i === 0 ? 'M' : 'L'}${x},${y}`
    }).join(' ')
  }, [stats.trendData])

  const areaPoints = useMemo(() => {
    if (stats.trendData.length < 2) return ''
    const w = 240
    const h = 50
    const pad = 4
    const stepX = (w - pad * 2) / (stats.trendData.length - 1)
    let path = sparkPoints
    const lastX = pad + (stats.trendData.length - 1) * stepX
    path += ` L${lastX},${h - pad} L${pad},${h - pad} Z`
    return path
  }, [stats.trendData, sparkPoints])

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="review-summary-card" style={{ animationDelay: '0s' }}>
          <div className="review-summary-value">{stats.totalReviews}</div>
          <div className="review-summary-label">Total Reviews</div>
        </div>
        <div className="review-summary-card" style={{ animationDelay: '0.08s' }}>
          <div className="review-summary-value">{stats.avgRating}</div>
          <div className="review-summary-label">Avg Rating</div>
          <StarRating value={Math.round(stats.avgRating)} size={14} />
        </div>
        <div className="review-summary-card" style={{ animationDelay: '0.16s' }}>
          <div className="review-summary-value">
            {reviews.filter(r => r.overallRating >= 4).length}
          </div>
          <div className="review-summary-label">High Rated (4+)</div>
        </div>
        <div className="review-summary-card" style={{ animationDelay: '0.24s' }}>
          <div className="review-summary-value">
            {reviews.filter(r => r.overallRating <= 2).length}
          </div>
          <div className="review-summary-label">Needs Attention</div>
        </div>
      </div>

      {/* Rating Distribution */}
      <div className="review-form-section">
        <div className="review-form-section-title">
          <BarChart3 size={16} /> Rating Distribution
        </div>
        <div className="review-distribution">
          {[5, 4, 3, 2, 1].map(star => (
            <div key={star} className="review-distribution-bar-group">
              <div className="review-distribution-count">{stats.distribution[star] || 0}</div>
              <div
                className={`review-distribution-bar review-distribution-bar--${star}`}
                style={{ height: `${Math.max(4, ((stats.distribution[star] || 0) / maxDist) * 100)}%` }}
              />
              <div className="review-distribution-label">{star}★</div>
            </div>
          ))}
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="review-form-section">
        <div className="review-form-section-title">
          <Target size={16} /> Category Breakdown
        </div>
        {(Object.keys(CATEGORY_LABELS) as Array<keyof CategoryRatings>).map(cat => {
          const avg = stats.categoryAverages[cat] || 0
          return (
            <div key={cat} className="review-category-rating">
              <span className="review-category-label">{CATEGORY_LABELS[cat]}</span>
              <div className="flex items-center gap-2 flex-1 mx-3">
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--vl-bg-tertiary, var(--color-muted))', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(avg / 5) * 100}%`, borderRadius: 3, background: avg >= 4 ? '#10b981' : avg >= 3 ? '#f59e0b' : '#ef4444', transition: 'width 0.5s ease' }} />
                </div>
              </div>
              <span className="review-category-value">{avg}</span>
            </div>
          )
        })}
      </div>

      {/* Trend Sparkline */}
      <div className="review-form-section">
        <div className="review-form-section-title">
          <TrendingUp size={16} /> Rating Trend (Last 10 Reviews)
        </div>
        {stats.trendData.length >= 2 ? (
          <div className="review-sparkline" style={{ display: 'flex', justifyContent: 'center' }}>
            <svg viewBox="0 0 240 50" width="100%" height={50} style={{ maxWidth: 400 }}>
              <defs>
                <linearGradient id="review-sparkline-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              {areaPoints && <path d={areaPoints} className="review-sparkline-area" />}
              <path d={sparkPoints} className="review-sparkline-path" />
              {stats.trendData.map((d, i) => {
                const w = 240
                const h = 50
                const pad = 4
                const stepX = (w - pad * 2) / (stats.trendData.length - 1)
                const cx = pad + i * stepX
                const cy = pad + (h - pad * 2) - ((d.rating - 1) / 4) * (h - pad * 2)
                return <circle key={i} className="review-sparkline-dot" cx={cx} cy={cy}>
                  <title>{d.date}: {d.rating}★</title>
                </circle>
              })}
            </svg>
          </div>
        ) : (
          <p className="text-[11px] vl-text-muted text-center py-4">Not enough data for trend</p>
        )}
      </div>

      {/* Top & Lowest Rated */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="review-form-section">
          <div className="review-form-section-title">
            <Award size={16} /> Top Rated Meetings
          </div>
          <ul className="review-rated-list">
            {stats.topRated.map((m, i) => (
              <li key={m.id} className="review-rated-list-item">
                <span className="review-rated-list-item-rank" style={{ color: i === 0 ? '#fbbf24' : i === 1 ? '#d1d5db' : '#d97706' }}>
                  #{i + 1}
                </span>
                <span className="review-rated-list-item-title">{m.meetingTitle}</span>
                <span className="review-rated-list-item-score" style={{ color: '#10b981' }}>
                  {m.rating}★
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="review-form-section">
          <div className="review-form-section-title">
            <AlertTriangle size={16} /> Needs Attention
          </div>
          <ul className="review-rated-list">
            {stats.lowestRated.map((m, i) => (
              <li key={m.id} className="review-rated-list-item">
                <span className="review-rated-list-item-rank" style={{ color: '#ef4444' }}>
                  ⚠
                </span>
                <span className="review-rated-list-item-title">{m.meetingTitle}</span>
                <span className="review-rated-list-item-score" style={{ color: m.rating <= 2 ? '#ef4444' : '#f59e0b' }}>
                  {m.rating}★
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Main Component
// ============================================================

export function MeetingReviewSystem() {
  const [activeTab, setActiveTab] = useState<'cards' | 'summary'>('cards')
  const [reviews, setReviews] = useState<MeetingReview[]>([])
  const [unreviewed, setUnreviewed] = useState<UnreviewedMeeting[]>(SAMPLE_UNREVIEWED)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [reviewingMeeting, setReviewingMeeting] = useState<UnreviewedMeeting | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterMinRating, setFilterMinRating] = useState<string>('0')
  const [sortBy, setSortBy] = useState<'date' | 'rating'>('date')
  const [stats, setStats] = useState<{
    totalReviews: number
    avgRating: number
    distribution: Record<number, number>
    categoryAverages: Record<string, number>
    topRated: { id: string; meetingTitle: string; rating: number; type: string }[]
    lowestRated: { id: string; meetingTitle: string; rating: number; type: string }[]
    trendData: { date: string; rating: number }[]
  } | null>(null)
  const [loading, setLoading] = useState(true)

  const allAgents = useMemo(() => {
    const agentSet = new Set<string>()
    reviews.forEach(r => r.participants.forEach(p => agentSet.add(p)))
    unreviewed.forEach(m => m.participants.forEach(p => agentSet.add(p)))
    return Array.from(agentSet)
  }, [reviews, unreviewed])

  // Load from localStorage then API
  useEffect(() => {
    const loadReviews = async () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored) as MeetingReview[]
          setReviews(parsed)
        } else {
          const res = await fetch('/api/reviews')
          if (res.ok) {
            const data = await res.json()
            if (data.reviews) {
              setReviews(data.reviews)
              localStorage.setItem(STORAGE_KEY, JSON.stringify(data.reviews))
            }
          }
        }
      } catch {
        // Fallback: fetch from API
        try {
          const res = await fetch('/api/reviews')
          if (res.ok) {
            const data = await res.json()
            if (data.reviews) {
              setReviews(data.reviews)
            }
          }
        } catch { /* silent */ }
      }
      setLoading(false)
    }
    loadReviews()
  }, [])

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/reviews?mode=stats')
        if (res.ok) {
          const data = await res.json()
          setStats(data)
        }
      } catch { /* silent */ }
    }
    fetchStats()
  }, [reviews])

  // Persist reviews
  useEffect(() => {
    if (reviews.length > 0 && !loading) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews))
    }
  }, [reviews, loading])

  const handleReviewSubmit = useCallback((reviewData: Omit<MeetingReview, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newReview: MeetingReview = {
      ...reviewData,
      id: generateId('rev'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setReviews(prev => [newReview, ...prev])
    setUnreviewed(prev => prev.filter(m => m.id !== reviewData.meetingId))
    setReviewingMeeting(null)
  }, [])

  const handleDeleteReview = useCallback((id: string) => {
    setReviews(prev => prev.filter(r => r.id !== id))
    setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next })
  }, [])

  const handleBulkMarkReviewed = useCallback(() => {
    // For this implementation, already-reviewed items are marked
    setSelectedIds(new Set())
  }, [])

  const handleExport = useCallback(() => {
    const json = JSON.stringify(reviews, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'meeting-reviews.json'
    a.click()
    URL.revokeObjectURL(url)
  }, [reviews])

  const filteredReviews = useMemo(() => {
    let result = [...reviews]

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(r =>
        r.meetingTitle.toLowerCase().includes(q) ||
        r.feedback.toLowerCase().includes(q) ||
        r.reviewerName.toLowerCase().includes(q)
      )
    }
    if (filterType !== 'all') {
      result = result.filter(r => r.meetingType === filterType)
    }
    if (filterMinRating !== '0') {
      const min = parseInt(filterMinRating, 10)
      if (!isNaN(min)) result = result.filter(r => r.overallRating >= min)
    }

    result.sort((a, b) => {
      if (sortBy === 'rating') return b.overallRating - a.overallRating
      return new Date(b.reviewedAt).getTime() - new Date(a.reviewedAt).getTime()
    })

    return result
  }, [reviews, searchQuery, filterType, filterMinRating, sortBy])

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredReviews.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredReviews.map(r => r.id)))
    }
  }, [selectedIds, filteredReviews])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" style={{ color: 'var(--vl-text-muted)' }}>
        <div className="text-sm">Loading reviews...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex items-center gap-2">
        {(['cards', 'summary'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="review-filter-chip"
            style={activeTab === tab ? {
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#10b981',
            } : undefined}
          >
            {tab === 'cards' ? <><FileText size={12} /> Review Cards</> : <><BarChart3 size={12} /> Summary Dashboard</>}
          </button>
        ))}
      </div>

      {activeTab === 'summary' && stats ? (
        <ReviewSummaryDashboard reviews={reviews} stats={stats} />
      ) : (
        <>
          {/* Unreviewed Meetings */}
          {unreviewed.length > 0 && !reviewingMeeting && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold vl-text-muted uppercase tracking-wider">Pending Reviews ({unreviewed.length})</h3>
              {unreviewed.map(meeting => (
                <div key={meeting.id} className="review-card review-card--unreviewed">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="review-card-title">{meeting.title}</div>
                      <div className="review-card-meta">
                        <span className="review-card-date">{formatDate(meeting.date)}</span>
                        <span className="review-card-type-badge">
                          <Users size={10} />
                          {meeting.type}
                        </span>
                      </div>
                      <div className="review-card-participants mt-2">
                        {meeting.participants.map((p, pi) => (
                          <div
                            key={pi}
                            className="review-card-avatar"
                            style={{ background: getAgentColor(p), zIndex: meeting.participants.length - pi }}
                            title={p}
                          >
                            {getAgentInitials(p)}
                          </div>
                        ))}
                      </div>
                    </div>
                    <button
                      className="review-cta-btn"
                      onClick={() => setReviewingMeeting(meeting)}
                    >
                      <MessageSquarePlus size={14} />
                      Review Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Review Form */}
          {reviewingMeeting && (
            <ReviewForm
              meeting={reviewingMeeting}
              agents={allAgents}
              onSubmit={handleReviewSubmit}
              onCancel={() => setReviewingMeeting(null)}
            />
          )}

          {/* Filter Bar */}
          <div className="review-filter-bar">
            <div className="flex items-center gap-1 flex-1" style={{ minWidth: 180 }}>
              <Search size={14} style={{ color: 'var(--vl-text-muted)' }} />
              <input
                className="review-input"
                placeholder="Search reviews..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ border: 'none', background: 'transparent', padding: '4px 8px' }}
              />
            </div>
            <select className="review-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="all">All Types</option>
              <option value="team">Team</option>
              <option value="individual">Individual</option>
            </select>
            <select className="review-select" value={filterMinRating} onChange={e => setFilterMinRating(e.target.value)}>
              <option value="0">Any Rating</option>
              <option value="4">4+ Stars</option>
              <option value="3">3+ Stars</option>
              <option value="2">2+ Stars</option>
            </select>
            <button className="review-filter-chip" onClick={() => setSortBy(prev => prev === 'date' ? 'rating' : 'date')}>
              <ArrowUpDown size={12} />
              {sortBy === 'date' ? 'Date' : 'Rating'}
            </button>
          </div>

          {/* Bulk Actions */}
          {selectedIds.size > 0 && (
            <div className="review-bulk-bar">
              <span className="review-bulk-count">{selectedIds.size} selected</span>
              <button className="review-bulk-btn" onClick={handleBulkMarkReviewed}>
                <CheckSquare size={12} /> Mark Reviewed
              </button>
              <button className="review-bulk-btn" onClick={handleExport}>
                <Download size={12} /> Export Selected
              </button>
              <button className="review-bulk-btn" onClick={() => setSelectedIds(new Set())}>
                <X size={12} /> Clear
              </button>
            </div>
          )}

          {/* Select All + Export All */}
          <div className="flex items-center justify-between">
            <button
              className="review-filter-chip"
              onClick={toggleSelectAll}
            >
              {selectedIds.size === filteredReviews.length && filteredReviews.length > 0 ? (
                <><CheckSquare size={12} /> Deselect All</>
              ) : (
                <><Square size={12} /> Select All ({filteredReviews.length})</>
              )}
            </button>
            <div className="review-export-btns">
              <button className="review-export-btn" onClick={handleExport}>
                <Download size={12} /> Export All as JSON
              </button>
            </div>
          </div>

          {/* Reviews List */}
          <div className="space-y-3">
            {filteredReviews.length === 0 && (
              <div className="text-center py-10" style={{ color: 'var(--vl-text-muted)' }}>
                <FileText size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">No reviews found</p>
              </div>
            )}
            {filteredReviews.map((review, idx) => (
              <div key={review.id} className="relative group">
                <ReviewCardView
                  review={review}
                  expanded={expandedId === review.id}
                  onToggle={() => setExpandedId(prev => prev === review.id ? null : review.id)}
                  selected={selectedIds.has(review.id)}
                  onSelect={() => toggleSelect(review.id)}
                  index={idx}
                />
                <button
                  onClick={() => handleDeleteReview(review.id)}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}
                  title="Delete review"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Results count */}
          <div className="text-center py-2">
            <span className="text-[10px] vl-text-muted">
              Showing {filteredReviews.length} of {reviews.length} reviews
            </span>
          </div>
        </>
      )}
    </div>
  )
}
