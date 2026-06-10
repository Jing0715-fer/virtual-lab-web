'use client'

/**
 * Agent Collaboration Matrix — N×N grid showing agent-pair collaboration history
 *
 * Features:
 * - N×N grid where each cell shows number of shared meetings
 * - Cell color intensity proportional to collaboration frequency
 * - Click cell to see details of shared meetings
 * - Agent avatars on both axes
 * - Tooltip with meeting details on hover
 */

import React, { useMemo, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MessageSquare, Calendar, Users, ArrowRight } from 'lucide-react'
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Agent, Meeting } from './shared-components'

// ============================================================
// Types
// ============================================================

interface MatrixCell {
  rowAgent: Agent
  colAgent: Agent
  sharedMeetings: Meeting[]
  messageCount: number
}

interface AgentCollaborationMatrixProps {
  agents: Agent[]
  meetings: Meeting[]
}

interface MeetingDetail {
  meetingId: string
  meetingName: string
  meetingType: 'team' | 'individual'
  status: string
  sharedMessageCount: number
  totalMessages: number
  participatedAt: string
}

// ============================================================
// Helpers
// ============================================================

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function getHeatColor(value: number, maxValue: number): string {
  if (maxValue === 0) return 'var(--vl-bg-inner)'
  const intensity = value / maxValue
  if (intensity === 0) return 'var(--vl-bg-inner)'
  // Green spectrum from low to high
  const alpha = 0.12 + intensity * 0.65
  return `rgba(16, 185, 129, ${alpha})`
}

function getHeatBorderColor(value: number, maxValue: number): string {
  if (maxValue === 0) return 'transparent'
  const intensity = value / maxValue
  if (intensity === 0) return 'transparent'
  return `rgba(16, 185, 129, ${0.15 + intensity * 0.35})`
}

// ============================================================
// Cell Detail Popover
// ============================================================

function CellDetailPanel({
  cell,
  onClose,
}: {
  cell: MatrixCell
  onClose: () => void
}) {
  const details = useMemo<MeetingDetail[]>(() => {
    return cell.sharedMeetings.map((m) => {
      const rowMessages = (m.messages || []).filter(
        (msg) => msg.agentName === cell.rowAgent.title
      )
      const colMessages = (m.messages || []).filter(
        (msg) => msg.agentName === cell.colAgent.title
      )
      return {
        meetingId: m.id,
        meetingName: m.saveName || 'Untitled',
        meetingType: m.type,
        status: m.status,
        sharedMessageCount: Math.min(rowMessages.length, colMessages.length),
        totalMessages: (m.messages || []).length,
        participatedAt: m.createdAt,
      }
    })
  }, [cell])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* Panel */}
      <div
        className="relative w-full max-w-md max-h-[80vh] rounded-xl overflow-hidden shadow-2xl"
        style={{
          background: 'var(--vl-bg-card)',
          border: '1px solid var(--vl-border)',
          backdropFilter: 'blur(16px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b" style={{ borderColor: 'var(--vl-border)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Agent pair display */}
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                style={{ backgroundColor: cell.rowAgent.color }}
              >
                {getInitials(cell.rowAgent.title)}
              </div>
              <ArrowRight className="size-3" style={{ color: 'var(--vl-text-muted)' }} />
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                style={{ backgroundColor: cell.colAgent.color }}
              >
                {getInitials(cell.colAgent.title)}
              </div>
              <span className="text-sm font-semibold ml-1" style={{ color: 'var(--vl-text-heading)' }}>
                {cell.rowAgent.title} × {cell.colAgent.title}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[var(--vl-bg-card-hover)] transition-colors"
              aria-label="Close detail panel"
            >
              <X className="size-4" style={{ color: 'var(--vl-text-muted)' }} />
            </button>
          </div>

          <div className="flex items-center gap-3 mt-2">
            <Badge
              variant="outline"
              className="text-[10px]"
              style={{ color: '#10b981', borderColor: 'rgba(16,185,129,0.3)', backgroundColor: 'rgba(16,185,129,0.08)' }}
            >
              <MessageSquare className="size-2.5 mr-1" />
              {cell.sharedMeetings.length} shared meetings
            </Badge>
            <Badge
              variant="outline"
              className="text-[10px]"
              style={{ color: 'var(--vl-text-muted)', borderColor: 'var(--vl-border-subtle)' }}
            >
              {cell.messageCount} total interactions
            </Badge>
          </div>
        </div>

        {/* Meeting list */}
        <ScrollArea className="max-h-[50vh]">
          <div className="p-3 space-y-2">
            {details.length === 0 && (
              <p className="text-xs text-center py-6" style={{ color: 'var(--vl-text-muted)' }}>
                No shared meetings found
              </p>
            )}
            {details.map((detail, i) => (
              <motion.div
                key={detail.meetingId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-3 rounded-lg border transition-colors hover:bg-[var(--vl-bg-card-hover)]"
                style={{
                  borderColor: 'var(--vl-border-subtle)',
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium" style={{ color: 'var(--vl-text-heading)' }}>
                    {detail.meetingName}
                  </span>
                  <div className="flex items-center gap-1">
                    <Badge
                      variant="outline"
                      className="text-[8px] px-1 py-0"
                      style={{
                        color: detail.meetingType === 'team' ? '#10b981' : '#06b6d4',
                        borderColor: detail.meetingType === 'team' ? 'rgba(16,185,129,0.3)' : 'rgba(6,182,212,0.3)',
                      }}
                    >
                      {detail.meetingType}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-[8px] px-1 py-0"
                      style={{
                        color: detail.status === 'completed' ? '#10b981' : detail.status === 'running' ? '#f59e0b' : 'var(--vl-text-muted)',
                        borderColor: detail.status === 'completed' ? 'rgba(16,185,129,0.3)' : detail.status === 'running' ? 'rgba(245,158,11,0.3)' : 'var(--vl-border-subtle)',
                      }}
                    >
                      {detail.status}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[10px]" style={{ color: 'var(--vl-text-muted)' }}>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="size-2.5" />
                    {detail.sharedMessageCount} shared msgs
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="size-2.5" />
                    {new Date(detail.participatedAt).toLocaleDateString()}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </motion.div>
  )
}

// ============================================================
// Main Component
// ============================================================

export default function AgentCollaborationMatrix({
  agents,
  meetings,
}: AgentCollaborationMatrixProps) {
  const [selectedCell, setSelectedCell] = useState<MatrixCell | null>(null)

  // Build collaboration matrix data
  const { matrix, maxShared } = useMemo(() => {
    const agentMap = new Map(agents.map((a) => [a.id, a]))
    const n = agents.length
    const matrix: MatrixCell[][] = []

    let maxShared = 0

    for (let i = 0; i < n; i++) {
      matrix[i] = []
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = {
            rowAgent: agents[i],
            colAgent: agents[j],
            sharedMeetings: [],
            messageCount: 0,
          }
          continue
        }

        const rowAgent = agents[i]
        const colAgent = agents[j]

        // Find shared meetings (both agents participated)
        const sharedMeetings = meetings.filter((m) => {
          const hasRow = m.messages?.some((msg) => msg.agentName === rowAgent.title)
          const hasCol = m.messages?.some((msg) => msg.agentName === colAgent.title)
          return hasRow && hasCol
        })

        const messageCount = sharedMeetings.reduce((sum, m) => {
          const rowMsgs = (m.messages || []).filter(
            (msg) => msg.agentName === rowAgent.title
          )
          const colMsgs = (m.messages || []).filter(
            (msg) => msg.agentName === colAgent.title
          )
          return sum + Math.min(rowMsgs.length, colMsgs.length)
        }, 0)

        const sharedCount = sharedMeetings.length
        if (sharedCount > maxShared) maxShared = sharedCount

        matrix[i][j] = {
          rowAgent,
          colAgent,
          sharedMeetings,
          messageCount,
        }
      }
    }

    return { matrix, maxShared }
  }, [agents, meetings])

  const handleCellClick = useCallback((cell: MatrixCell) => {
    setSelectedCell(cell)
  }, [])

  if (agents.length === 0) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{
          background: 'var(--vl-bg-card)',
          border: '1px solid var(--vl-border)',
        }}
      >
        <Users className="size-8 mx-auto mb-2" style={{ color: 'var(--vl-text-muted)', opacity: 0.4 }} />
        <p className="text-sm" style={{ color: 'var(--vl-text-muted)' }}>
          No agents to display
        </p>
      </div>
    )
  }

  const avatarSize = 32
  const cellSize = Math.max(36, Math.min(48, 400 / agents.length))

  return (
    <>
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: 'var(--vl-bg-card)',
          border: '1px solid var(--vl-border)',
        }}
      >
        {/* Title */}
        <div className="p-4 border-b" style={{ borderColor: 'var(--vl-border)' }}>
          <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--vl-text-heading)' }}>
            <Users className="size-4 text-emerald-500" />
            Collaboration Matrix
          </h3>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--vl-text-muted)' }}>
            Click any cell to see shared meeting details
          </p>
        </div>

        {/* Matrix */}
        <div className="p-4 overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Top-left corner spacer */}
            <table className="border-collapse">
              <thead>
                <tr>
                  <th style={{ width: avatarSize + 12 }} />
                  {agents.map((agent) => (
                    <th
                      key={agent.id}
                      className="p-1 text-center"
                      style={{ width: cellSize }}
                    >
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-bold text-white mx-auto cursor-default"
                              style={{
                                backgroundColor: agent.color,
                                boxShadow: `0 0 8px ${agent.color}30`,
                              }}
                            >
                              {getInitials(agent.title)}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="tooltip-glass text-[10px]">
                            {agent.title}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {agents.map((rowAgent, i) => (
                  <tr key={rowAgent.id}>
                    {/* Row header */}
                    <td className="p-1 pr-2">
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-bold text-white cursor-default"
                              style={{
                                backgroundColor: rowAgent.color,
                                boxShadow: `0 0 8px ${rowAgent.color}30`,
                              }}
                            >
                              {getInitials(rowAgent.title)}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="tooltip-glass text-[10px]">
                            {rowAgent.title}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>

                    {/* Matrix cells */}
                    {agents.map((_, j) => {
                      const cell = matrix[i][j]
                      const isDiagonal = i === j
                      const value = cell.sharedMeetings.length
                      const isHighValue = maxShared > 0 && value >= maxShared * 0.7

                      return (
                        <td key={j} className="p-0.5">
                          {isDiagonal ? (
                            <div
                              className="flex items-center justify-center rounded-md"
                              style={{
                                width: cellSize,
                                height: cellSize,
                                backgroundColor: `${rowAgent.color}12`,
                                border: `1px dashed ${rowAgent.color}30`,
                              }}
                            >
                              <span
                                className="text-[8px] font-bold"
                                style={{ color: `${rowAgent.color}88` }}
                              >
                                —
                              </span>
                            </div>
                          ) : (
                            <TooltipProvider delayDuration={200}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <motion.button
                                    whileHover={{ scale: 1.12 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleCellClick(cell)}
                                    className="flex items-center justify-center rounded-md cursor-pointer transition-shadow"
                                    style={{
                                      width: cellSize,
                                      height: cellSize,
                                      backgroundColor: getHeatColor(value, maxShared),
                                      border: `1px solid ${getHeatBorderColor(value, maxShared)}`,
                                      boxShadow: isHighValue
                                        ? `0 0 8px rgba(16, 185, 129, 0.2)`
                                        : 'none',
                                    }}
                                    aria-label={`${rowAgent.title} × ${agents[j].title}: ${value} shared meetings`}
                                  >
                                    <span
                                      className="text-[10px] font-bold"
                                      style={{
                                        color:
                                          value > 0
                                            ? 'rgba(16, 185, 129, 0.9)'
                                            : 'var(--vl-text-muted)',
                                      }}
                                    >
                                      {value}
                                    </span>
                                  </motion.button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="tooltip-glass text-[10px]">
                                  <div className="text-center">
                                    <div className="font-medium">
                                      {rowAgent.title} × {agents[j].title}
                                    </div>
                                    <div style={{ color: 'var(--vl-text-muted)' }}>
                                      {value} shared meetings · {cell.messageCount} interactions
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-end gap-2 mt-4">
            <span className="text-[9px]" style={{ color: 'var(--vl-text-muted)' }}>
              Less
            </span>
            {[0, 0.25, 0.5, 0.75, 1].map((level, i) => (
              <div
                key={i}
                className="w-4 h-4 rounded-sm"
                style={{
                  backgroundColor:
                    level === 0
                      ? 'var(--vl-bg-inner)'
                      : `rgba(16, 185, 129, ${0.12 + level * 0.65})`,
                  border: '1px solid var(--vl-border-subtle)',
                }}
              />
            ))}
            <span className="text-[9px]" style={{ color: 'var(--vl-text-muted)' }}>
              More
            </span>
          </div>
        </div>
      </div>

      {/* Cell Detail Panel */}
      <AnimatePresence>
        {selectedCell && (
          <CellDetailPanel
            cell={selectedCell}
            onClose={() => setSelectedCell(null)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
