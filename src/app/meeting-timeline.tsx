'use client'

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Calendar,
  Users, User, Clock, Filter, MessageSquare, Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import type { Agent, DiscussionMessage } from './shared-components'

// ============================================================
// Types
// ============================================================

export interface MeetingTimelineData {
  id: string
  type: 'team' | 'individual'
  status: 'draft' | 'running' | 'completed'
  agenda: string
  saveName: string
  createdAt: string
  updatedAt: string
  messages: DiscussionMessage[]
  teamLeadId?: string
  teamLead?: Agent
  teamMembers?: Agent[]
  teamMemberId?: string
  teamMember?: Agent
  numRounds?: number
  // Timeline-specific computed fields
  timelinePosition: number
  duration: number // minutes
  participantCount: number
}

interface Props {
  meetings: MeetingTimelineData[]
  onSelectMeeting: (meeting: MeetingTimelineData) => void
}

type ZoomLevel = 'day' | 'week' | 'month' | 'year'
type TypeFilter = 'all' | 'team' | 'individual'
type StatusFilter = 'all' | 'running' | 'completed' | 'draft'

// ============================================================
// Constants
// ============================================================

const ZOOM_MS: Record<ZoomLevel, number> = {
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
  year: 365 * 24 * 60 * 60 * 1000,
}

const ZOOM_LABELS: Record<ZoomLevel, string> = {
  day: 'Day',
  week: 'Week',
  month: 'Month',
  year: 'Year',
}

const MARKER_RADIUS = 8
const MARKER_RADIUS_HOVER = 11
const TIMELINE_HEIGHT = 200
const TIMELINE_AXIS_HEIGHT = 50
const PADDING_LEFT = 60
const PADDING_RIGHT = 60
const SVG_WIDTH = 1200

const COLORS = {
  team: '#10b981',
  individual: '#06b6d4',
  running: '#f59e0b',
  completed: '#10b981',
  draft: '#6b7280',
  now: '#ef4444',
  axis: 'var(--vl-chart-axis-line, #cbd5e1)',
  axisText: 'var(--vl-chart-axis, #6b7280)',
  grid: 'var(--vl-chart-grid, #e5e7eb)',
  background: 'var(--vl-bg-card, #ffffff)',
  text: 'var(--vl-text-primary, #0f172a)',
  textMuted: 'var(--vl-text-muted, #6b7280)',
}

// ============================================================
// Helpers
// ============================================================

function formatDateLabel(date: Date, zoom: ZoomLevel): string {
  switch (zoom) {
    case 'day':
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    case 'week':
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    case 'month':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    case 'year':
      return date.toLocaleDateString('en-US', { month: 'short' })
  }
}

function generateDateTicks(rangeStart: Date, rangeEnd: Date, zoom: ZoomLevel): Date[] {
  const ticks: Date[] = []
  const rangeMs = rangeEnd.getTime() - rangeStart.getTime()

  let intervalMs: number
  switch (zoom) {
    case 'day': intervalMs = (60 * 60 * 1000) // 1 hour; break
    case 'week': intervalMs = (24 * 60 * 60 * 1000) // 1 day; break
    case 'month': intervalMs = (2 * 24 * 60 * 60 * 1000) // 2 days; break
    case 'year': intervalMs = (30 * 24 * 60 * 60 * 1000) // ~1 month; break
  }

  const start = rangeStart.getTime()
  const end = rangeEnd.getTime()
  let current = start
  while (current <= end) {
    ticks.push(new Date(current))
    current += intervalMs
  }
  return ticks
}

function computeDurationMinutes(messages: DiscussionMessage[]): number {
  if (!messages || messages.length === 0) return 0
  const first = messages.reduce((a, b) => a.createdAt < b.createdAt ? a : b)
  const last = messages.reduce((a, b) => a.createdAt > b.createdAt ? a : b)
  return Math.max(1, Math.round((new Date(last.createdAt).getTime() - new Date(first.createdAt).getTime()) / 60000))
}

function dateToX(date: Date, rangeStart: Date, rangeEnd: Date, trackWidth: number): number {
  const ratio = (date.getTime() - rangeStart.getTime()) / (rangeEnd.getTime() - rangeStart.getTime())
  return PADDING_LEFT + ratio * trackWidth
}

function participantCount(meeting: MeetingTimelineData): number {
  if (meeting.type === 'team') {
    const memberCount = meeting.teamMembers?.length || 0
    return memberCount + (meeting.teamLead ? 1 : 0)
  }
  return 1
}

// ============================================================
// Component
// ============================================================

export default function MeetingTimeline({ meetings, onSelectMeeting }: Props) {
  const [zoom, setZoom] = useState<ZoomLevel>('week')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number; meeting: MeetingTimelineData } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, scrollLeft: 0 })
  const [scrollLeft, setScrollLeft] = useState(0)

  // Filter meetings
  const filteredMeetings = useMemo(() => {
    return meetings.filter(m => {
      if (typeFilter !== 'all' && m.type !== typeFilter) return false
      if (statusFilter !== 'all' && m.status !== statusFilter) return false
      return true
    })
  }, [meetings, typeFilter, statusFilter])

  // Compute summary
  const summary = useMemo(() => {
    const total = filteredMeetings.length
    const team = filteredMeetings.filter(m => m.type === 'team').length
    const individual = filteredMeetings.filter(m => m.type === 'individual').length
    const running = filteredMeetings.filter(m => m.status === 'running').length
    const completed = filteredMeetings.filter(m => m.status === 'completed').length
    const draft = filteredMeetings.filter(m => m.status === 'draft').length
    return { total, team, individual, running, completed, draft }
  }, [filteredMeetings])

  // Compute date range based on meetings and zoom
  const { rangeStart, rangeEnd } = useMemo(() => {
    const now = new Date()
    const zoomMs = ZOOM_MS[zoom]
    const center = now.getTime()
    return {
      rangeStart: new Date(center - zoomMs / 2),
      rangeEnd: new Date(center + zoomMs / 2),
    }
  }, [zoom])

  // Generate date ticks
  const dateTicks = useMemo(
    () => generateDateTicks(rangeStart, rangeEnd, zoom),
    [rangeStart, rangeEnd, zoom]
  )

  const trackWidth = SVG_WIDTH - PADDING_LEFT - PADDING_RIGHT

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    isDragging.current = true
    dragStart.current = { x: e.clientX, scrollLeft }
  }, [scrollLeft])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return
    const dx = e.clientX - dragStart.current.x
    setScrollLeft(prev => Math.min(0, Math.max(-400, prev - dx)))
  }, [])

  const handleMouseUp = useCallback(() => {
    isDragging.current = false
  }, [])

  // Touch handlers for mobile
  const touchStart = useRef({ x: 0, scroll: 0 })
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, scroll: scrollLeft }
  }, [scrollLeft])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStart.current.x
    setScrollLeft(prev => Math.min(0, Math.max(-400, touchStart.current.scroll - dx)))
  }, [])

  // Now line position
  const nowX = useMemo(() => {
    return dateToX(new Date(), rangeStart, rangeEnd, trackWidth) + scrollLeft
  }, [rangeStart, rangeEnd, trackWidth, scrollLeft])

  // Marker positions
  const markers = useMemo(() => {
    return filteredMeetings.map(m => {
      const created = new Date(m.createdAt)
      const x = dateToX(created, rangeStart, rangeEnd, trackWidth) + scrollLeft
      const y = 30 + (m.type === 'team' ? 0 : 50)
      return { meeting: m, x, y }
    })
  }, [filteredMeetings, rangeStart, rangeEnd, trackWidth, scrollLeft])

  // Marker click handler
  const handleMarkerClick = useCallback((meeting: MeetingTimelineData) => {
    onSelectMeeting(meeting)
  }, [onSelectMeeting])

  // Handle zoom in/out
  const zoomOrder: ZoomLevel[] = ['day', 'week', 'month', 'year']
  const zoomIn = () => {
    const idx = zoomOrder.indexOf(zoom)
    if (idx > 0) setZoom(zoomOrder[idx - 1])
  }
  const zoomOut = () => {
    const idx = zoomOrder.indexOf(zoom)
    if (idx < zoomOrder.length - 1) setZoom(zoomOrder[idx + 1])
  }

  // Empty state
  if (meetings.length === 0) {
    return (
      <div className="w-full p-6">
        <Card className="vl-card border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-5 relative">
              <Calendar className="size-10 text-emerald-400" />
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center">
                <Clock className="size-3 text-cyan-400" />
              </div>
            </div>
            <h3 className="text-lg font-semibold vl-text-heading mb-2">No Meetings on Timeline</h3>
            <p className="text-sm vl-text-muted text-center max-w-md leading-relaxed">
              Schedule your first team or individual meeting to see it appear on the timeline.
              Track progress, duration, and participant activity over time.
            </p>
            <div className="mt-6 flex items-center gap-2 text-xs vl-text-muted">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                Team meetings
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-cyan-500" />
                Individual meetings
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="w-full space-y-4" ref={containerRef}>
        {/* Summary bar */}
        <div className="flex flex-wrap items-center gap-3 px-1">
          <div className="flex items-center gap-2 mr-2">
            <Layers className="size-4 text-emerald-400" />
            <span className="text-sm font-medium vl-text-heading">Timeline</span>
          </div>

          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs">
            <Users className="size-3 mr-1" />
            {summary.team} team
          </Badge>
          <Badge variant="outline" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30 text-xs">
            <User className="size-3 mr-1" />
            {summary.individual} individual
          </Badge>
          <Separator orientation="vertical" className="h-4" />
          <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs">
            {summary.running} running
          </Badge>
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs">
            {summary.completed} done
          </Badge>
          <Badge variant="outline" className="bg-slate-500/10 text-slate-400 border-slate-500/30 text-xs">
            {summary.draft} draft
          </Badge>
          <span className="text-xs vl-text-muted ml-auto">
            {summary.total} total meetings
          </span>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 px-1">
          {/* Zoom controls */}
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="icon" className="size-8" onClick={zoomIn} disabled={zoom === 'day'}>
              <ZoomIn className="size-3.5" />
            </Button>
            <Select value={zoom} onValueChange={(v) => setZoom(v as ZoomLevel)}>
              <SelectTrigger className="w-[90px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {zoomOrder.map(z => (
                  <SelectItem key={z} value={z} className="text-xs">{ZOOM_LABELS[z]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" className="size-8" onClick={zoomOut} disabled={zoom === 'year'}>
              <ZoomOut className="size-3.5" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Type filter */}
          <ToggleGroup type="single" value={typeFilter} onValueChange={(v) => v && setTypeFilter(v as TypeFilter)}>
            <ToggleGroupItem value="all" size="sm" className="text-xs h-8 px-3">All</ToggleGroupItem>
            <ToggleGroupItem value="team" size="sm" className="text-xs h-8 px-3">
              <Users className="size-3 mr-1" />
              Team
            </ToggleGroupItem>
            <ToggleGroupItem value="individual" size="sm" className="text-xs h-8 px-3">
              <User className="size-3 mr-1" />
              Individual
            </ToggleGroupItem>
          </ToggleGroup>

          <Separator orientation="vertical" className="h-6" />

          {/* Status filter */}
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <Filter className="size-3 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Status</SelectItem>
              <SelectItem value="running" className="text-xs">Running</SelectItem>
              <SelectItem value="completed" className="text-xs">Completed</SelectItem>
              <SelectItem value="draft" className="text-xs">Draft</SelectItem>
            </SelectContent>
          </Select>

          {/* Legend */}
          <div className="ml-auto flex items-center gap-3 text-[10px] vl-text-muted">
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Team
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-500" /> Individual
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-0.5 bg-red-500 rounded" /> Now
            </div>
          </div>
        </div>

        {/* SVG Timeline */}
        <Card className="vl-card overflow-hidden">
          <CardContent className="p-0">
            <div
              className="overflow-x-auto custom-scrollbar cursor-grab active:cursor-grabbing"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              style={{ scrollbarWidth: 'thin' }}
            >
              <svg
                ref={svgRef}
                width={SVG_WIDTH}
                height={TIMELINE_HEIGHT + TIMELINE_AXIS_HEIGHT}
                viewBox={`${scrollLeft} 0 ${SVG_WIDTH - scrollLeft} ${TIMELINE_HEIGHT + TIMELINE_AXIS_HEIGHT}`}
                className="min-w-full"
                style={{ touchAction: 'none' }}
              >
                {/* Background */}
                <rect width={SVG_WIDTH} height={TIMELINE_HEIGHT + TIMELINE_AXIS_HEIGHT} fill="var(--vl-bg-card, #fff)" />

                {/* Grid lines */}
                {dateTicks.map((tick, i) => {
                  const x = dateToX(tick, rangeStart, rangeEnd, trackWidth)
                  return (
                    <g key={i}>
                      <line
                        x1={x} y1={20}
                        x2={x} y2={TIMELINE_HEIGHT + 10}
                        stroke={COLORS.grid}
                        strokeWidth={0.5}
                        strokeDasharray={zoom === 'day' ? '4,4' : 'none'}
                        opacity={0.6}
                      />
                    </g>
                  )
                })}

                {/* Lane labels */}
                <text
                  x={8} y={55}
                  fontSize={11}
                  fill={COLORS.textMuted}
                  fontWeight={500}
                >
                  Team
                </text>
                <text
                  x={8} y={105}
                  fontSize={11}
                  fill={COLORS.textMuted}
                  fontWeight={500}
                >
                  Solo
                </text>

                {/* Lane background bands */}
                <rect
                  x={PADDING_LEFT} y={20}
                  width={trackWidth} height={45}
                  rx={4}
                  fill={COLORS.team}
                  opacity={0.04}
                />
                <rect
                  x={PADDING_LEFT} y={70}
                  width={trackWidth} height={45}
                  rx={4}
                  fill={COLORS.individual}
                  opacity={0.04}
                />

                {/* Connecting lines from markers to axis */}
                {markers.map(({ meeting, x, y }) => (
                  <line
                    key={`conn-${meeting.id}`}
                    x1={x} y1={y + MARKER_RADIUS}
                    x2={x} y2={TIMELINE_HEIGHT + 5}
                    stroke={meeting.type === 'team' ? COLORS.team : COLORS.individual}
                    strokeWidth={1}
                    opacity={0.15}
                    strokeDasharray="3,3"
                  />
                ))}

                {/* Meeting markers */}
                {markers.map(({ meeting, x, y }) => {
                  const isHovered = hoveredId === meeting.id
                  const color = meeting.type === 'team' ? COLORS.team : COLORS.individual
                  const statusColor = meeting.status === 'running' ? COLORS.running
                    : meeting.status === 'completed' ? COLORS.completed : COLORS.draft

                  return (
                    <g
                      key={meeting.id}
                      onMouseEnter={(e) => {
                        setHoveredId(meeting.id)
                        const rect = svgRef.current?.getBoundingClientRect()
                        if (rect) {
                          const svgX = (e as React.MouseEvent).clientX - rect.left + (scrollLeft < 0 ? scrollLeft : 0)
                          setTooltipPos({
                            x: (e as React.MouseEvent).clientX - rect.left,
                            y: (e as React.MouseEvent).clientY - rect.top,
                            meeting,
                          })
                        }
                      }}
                      onMouseLeave={() => {
                        setHoveredId(null)
                        setTooltipPos(null)
                      }}
                      onClick={() => handleMarkerClick(meeting)}
                      className="cursor-pointer"
                      role="button"
                      aria-label={`${meeting.type} meeting: ${meeting.saveName}`}
                    >
                      {/* Glow effect on hover */}
                      {isHovered && (
                        <circle
                          cx={x} cy={y}
                          r={MARKER_RADIUS_HOVER + 6}
                          fill={color}
                          opacity={0.15}
                        >
                          <animate
                            attributeName="r"
                            from={MARKER_RADIUS_HOVER + 4}
                            to={MARKER_RADIUS_HOVER + 8}
                            dur="1.2s"
                            repeatCount="indefinite"
                          />
                          <animate
                            attributeName="opacity"
                            from="0.15"
                            to="0.05"
                            dur="1.2s"
                            repeatCount="indefinite"
                          />
                        </circle>
                      )}

                      {/* Outer ring */}
                      <circle
                        cx={x} cy={y}
                        r={isHovered ? MARKER_RADIUS_HOVER : MARKER_RADIUS}
                        fill="var(--vl-bg-card, #fff)"
                        stroke={color}
                        strokeWidth={2.5}
                        className="transition-all duration-200"
                        style={{ filter: isHovered ? `drop-shadow(0 0 6px ${color})` : 'none' }}
                      />

                      {/* Inner status dot */}
                      <circle
                        cx={x} cy={y}
                        r={isHovered ? 5 : 4}
                        fill={statusColor}
                        className="transition-all duration-200"
                      />

                      {/* Running pulse */}
                      {meeting.status === 'running' && (
                        <circle
                          cx={x} cy={y}
                          r={MARKER_RADIUS}
                          fill="none"
                          stroke={COLORS.running}
                          strokeWidth={1.5}
                          opacity={0.6}
                        >
                          <animate
                            attributeName="r"
                            from={MARKER_RADIUS}
                            to={MARKER_RADIUS + 10}
                            dur="1.5s"
                            repeatCount="indefinite"
                          />
                          <animate
                            attributeName="opacity"
                            from="0.6"
                            to="0"
                            dur="1.5s"
                            repeatCount="indefinite"
                          />
                        </circle>
                      )}

                      {/* Label above marker */}
                      <text
                        x={x} y={y - (isHovered ? MARKER_RADIUS_HOVER + 6 : MARKER_RADIUS + 6)}
                        textAnchor="middle"
                        fontSize={isHovered ? 11 : 9}
                        fontWeight={isHovered ? 600 : 400}
                        fill={COLORS.text}
                        className="pointer-events-none select-none"
                      >
                        {meeting.saveName.length > 15 ? meeting.saveName.slice(0, 15) + '…' : meeting.saveName}
                      </text>
                    </g>
                  )
                })}

                {/* Now indicator */}
                <line
                  x1={nowX} y1={10}
                  x2={nowX} y2={TIMELINE_HEIGHT + 10}
                  stroke={COLORS.now}
                  strokeWidth={2}
                  opacity={0.8}
                />
                {/* Now diamond */}
                <polygon
                  points={`${nowX},10 ${nowX - 5},3 ${nowX + 5},3`}
                  fill={COLORS.now}
                  opacity={0.9}
                />
                {/* Now label */}
                <rect
                  x={nowX + 6} y={6}
                  width={36} height={16}
                  rx={3}
                  fill={COLORS.now}
                  opacity={0.9}
                />
                <text
                  x={nowX + 24} y={17}
                  textAnchor="middle"
                  fontSize={8}
                  fontWeight={600}
                  fill="#fff"
                  className="pointer-events-none"
                >
                  NOW
                </text>

                {/* Axis line */}
                <line
                  x1={PADDING_LEFT} y1={TIMELINE_HEIGHT + 15}
                  x2={PADDING_LEFT + trackWidth} y2={TIMELINE_HEIGHT + 15}
                  stroke={COLORS.axis}
                  strokeWidth={1}
                />

                {/* Date ticks and labels */}
                {dateTicks.map((tick, i) => {
                  const x = dateToX(tick, rangeStart, rangeEnd, trackWidth)
                  return (
                    <g key={`axis-${i}`}>
                      <line
                        x1={x} y1={TIMELINE_HEIGHT + 12}
                        x2={x} y2={TIMELINE_HEIGHT + 20}
                        stroke={COLORS.axis}
                        strokeWidth={1}
                      />
                      <text
                        x={x} y={TIMELINE_HEIGHT + 34}
                        textAnchor="middle"
                        fontSize={9}
                        fill={COLORS.axisText}
                        className="pointer-events-none select-none"
                      >
                        {formatDateLabel(tick, zoom)}
                      </text>
                    </g>
                  )
                })}

                {/* Year labels for year view */}
                {zoom === 'year' && dateTicks.length > 0 && (
                  <text
                    x={PADDING_LEFT + trackWidth / 2}
                    y={TIMELINE_HEIGHT + 48}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={600}
                    fill={COLORS.textMuted}
                    className="pointer-events-none"
                  >
                    {rangeStart.getFullYear()}
                  </text>
                )}
              </svg>
            </div>
          </CardContent>
        </Card>

        {/* Hover tooltip (rendered as floating div for richer content) */}
        <AnimatePresence>
          {tooltipPos && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="fixed z-50 pointer-events-none"
              style={{
                left: Math.min(tooltipPos.x + 12, window.innerWidth - 260),
                top: Math.max(tooltipPos.y - 10, 8),
              }}
            >
              <Card className="shadow-xl border-[var(--vl-border)] vl-card p-3 w-56" style={{ background: 'var(--vl-bg-card, #fff)' }}>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`${tooltipPos.meeting.type === 'team' ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' : 'bg-cyan-500/15 text-cyan-500 border-cyan-500/30'} text-[9px] px-1.5`}
                    >
                      {tooltipPos.meeting.type === 'team' ? 'Team' : 'Individual'}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1.5 ${
                        tooltipPos.meeting.status === 'running' ? 'bg-amber-500/15 text-amber-500 border-amber-500/30' :
                        tooltipPos.meeting.status === 'completed' ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' :
                        'bg-slate-500/15 text-slate-400 border-slate-500/30'
                      }`}
                    >
                      {tooltipPos.meeting.status}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium vl-text-heading leading-tight">{tooltipPos.meeting.saveName}</p>
                  <p className="text-xs vl-text-muted line-clamp-2">{tooltipPos.meeting.agenda}</p>
                  <div className="flex items-center gap-3 text-[10px] vl-text-muted pt-1 border-t border-[var(--vl-border)]">
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3" />
                      {new Date(tooltipPos.meeting.createdAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {computeDurationMinutes(tooltipPos.meeting.messages)}m
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="size-3" />
                      {tooltipPos.meeting.messages.length} msgs
                    </span>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  )
}
