'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Pencil, MessageSquare, Users, ChevronRight,
  Monitor, Smartphone, FileText, CheckCircle, ListChecks,
  Lightbulb, Target, BookOpen,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { WhiteboardCanvas } from './whiteboard-canvas'

// ============================================================
// Types
// ============================================================

interface Participant {
  id: string
  name: string
  color: string
  role: string
}

interface MeetingMessage {
  id: string
  agentName: string
  content: string
  roundIndex: number
  createdAt?: string
}

interface MeetingAgendaItem {
  label: string
  content: string
  icon: typeof FileText
}

export interface MeetingWhiteboardTabProps {
  meetingId: string
  meetingTitle?: string
  participants: Participant[]
  messages: MeetingMessage[]
  lang?: string
  className?: string
}

// ============================================================
// Constants — Meeting Notes Template
// ============================================================

const MEETING_NOTES_SECTIONS: MeetingAgendaItem[] = [
  { label: 'Agenda', content: '', icon: ListChecks },
  { label: 'Discussion', content: '', icon: MessageSquare },
  { label: 'Action Items', content: '', icon: CheckCircle },
  { label: 'Decisions', content: '', icon: Target },
]

function generateMeetingNotesTemplate(meetingTitle: string, participants: Participant[], messages: MeetingMessage[]): MeetingAgendaItem[] {
  const agentNames = participants.map(p => p.name).join(', ')
  const agendaText = `Meeting: ${meetingTitle || 'Untitled Meeting'}\nParticipants: ${agentNames}`

  const discussionItems = messages
    .slice(0, 10)
    .map(m => `[${m.agentName}]: ${m.content.substring(0, 150)}`)
    .join('\n\n')

  return [
    { label: 'Agenda', content: agendaText, icon: ListChecks },
    { label: 'Discussion', content: discussionItems || 'No discussion yet...', icon: MessageSquare },
    { label: 'Action Items', content: '• To be determined\n• Follow up on key points', icon: CheckCircle },
    { label: 'Decisions', content: '• To be recorded...', icon: Target },
  ]
}

// ============================================================
// Main Component
// ============================================================

export function MeetingWhiteboardTab({
  meetingId,
  meetingTitle = 'Untitled Meeting',
  participants = [],
  messages = [],
  lang = 'en',
  className = '',
}: MeetingWhiteboardTabProps) {
  const [mounted, setMounted] = useState(false)
  const [viewMode, setViewMode] = useState<'split' | 'whiteboard' | 'discussion'>('split')
  const [mobileView, setMobileView] = useState<'whiteboard' | 'discussion'>('whiteboard')
  const [isMobile, setIsMobile] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true))
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const notesSections = useMemo(
    () => generateMeetingNotesTemplate(meetingTitle, participants, messages),
    [meetingTitle, participants, messages]
  )

  const messageGroups = useMemo(() => {
    const groups: Record<number, MeetingMessage[]> = {}
    messages.forEach(m => {
      if (!groups[m.roundIndex]) groups[m.roundIndex] = []
      groups[m.roundIndex].push(m)
    })
    return Object.entries(groups).sort(([a], [b]) => Number(a) - Number(b))
  }, [messages])

  const getParticipantColor = useCallback((name: string) => {
    return participants.find(p => p.name === name)?.color || '#6366f1'
  }, [participants])

  if (!mounted) return null

  // Mobile: toggle view
  if (isMobile) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        {/* Mobile tab toggle */}
        <div className="flex items-center gap-1 p-2 border-b border-[var(--vl-border)]">
          <Button
            variant={mobileView === 'whiteboard' ? 'default' : 'ghost'}
            size="sm"
            className="flex-1 h-8 text-xs"
            onClick={() => setMobileView('whiteboard')}
          >
            <Pencil className="size-3.5 mr-1" />
            Whiteboard
          </Button>
          <Button
            variant={mobileView === 'discussion' ? 'default' : 'ghost'}
            size="sm"
            className="flex-1 h-8 text-xs"
            onClick={() => setMobileView('discussion')}
          >
            <MessageSquare className="size-3.5 mr-1" />
            Discussion
          </Button>
        </div>

        {/* Mobile content */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {mobileView === 'whiteboard' ? (
              <motion.div key="wb" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                <WhiteboardCanvas canvasId={`meeting-${meetingId}`} lang={lang} />
              </motion.div>
            ) : (
              <motion.div key="disc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto p-3 space-y-3 scrollbar-thin">
                {/* Meeting context */}
                <div className="vl-card rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="size-3.5 text-emerald-400" />
                    <h3 className="text-xs font-semibold vl-text-heading">{meetingTitle}</h3>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {participants.map(p => (
                      <div key={p.id} className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: p.color }} />
                        <span className="text-[10px] vl-text-body">{p.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Messages */}
                {messageGroups.map(([round, msgs]) => (
                  <div key={round}>
                    <div className="flex items-center gap-1 mb-1.5">
                      <Badge variant="secondary" className="text-[9px] px-1.5 h-4 bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                        Round {round}
                      </Badge>
                      <div className="flex-1 h-px bg-[var(--vl-border-subtle)]" />
                    </div>
                    <div className="space-y-2">
                      {msgs.map(msg => (
                        <div key={msg.id} className="vl-inner rounded-lg p-2 border-l-2" style={{ borderLeftColor: getParticipantColor(msg.agentName) }}>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-[10px] font-medium" style={{ color: getParticipantColor(msg.agentName) }}>{msg.agentName}</span>
                          </div>
                          <p className="text-xs vl-text-body leading-relaxed">{msg.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {messages.length === 0 && (
                  <div className="text-center py-8">
                    <MessageSquare className="size-6 vl-text-muted mx-auto mb-2 opacity-30" />
                    <p className="text-xs vl-text-muted">No discussion messages yet</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    )
  }

  // Desktop: split view
  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Desktop header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--vl-border)]">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="size-4 text-emerald-400" />
          <h3 className="text-sm font-semibold vl-text-heading">{meetingTitle}</h3>
          <Badge variant="secondary" className="text-[9px] px-1.5 h-4 bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
            {participants.length} participants · {messages.length} messages
          </Badge>
        </div>

        <div className="flex items-center gap-1">
          {/* View mode toggle */}
          <div className="flex items-center rounded-lg p-0.5 vl-inner border border-[var(--vl-border-subtle)]">
            <button
              onClick={() => setViewMode('split')}
              className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors ${
                viewMode === 'split' ? 'bg-emerald-500/15 text-emerald-400' : 'vl-text-muted hover:text-white'
              }`}
            >
              Split
            </button>
            <button
              onClick={() => setViewMode('whiteboard')}
              className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors ${
                viewMode === 'whiteboard' ? 'bg-emerald-500/15 text-emerald-400' : 'vl-text-muted hover:text-white'
              }`}
            >
              <Pencil className="size-3 inline mr-0.5" />Board
            </button>
            <button
              onClick={() => setViewMode('discussion')}
              className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors ${
                viewMode === 'discussion' ? 'bg-emerald-500/15 text-emerald-400' : 'vl-text-muted hover:text-white'
              }`}
            >
              <MessageSquare className="size-3 inline mr-0.5" />Chat
            </button>
          </div>

          {viewMode === 'split' && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="p-1.5 rounded-lg hover:bg-[var(--vl-bg-inner)] transition-colors vl-text-muted hover:text-white"
                  >
                    <ChevronRight className={`size-3.5 transition-transform ${sidebarCollapsed ? '' : 'rotate-180'}`} />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="vl-dialog text-[10px]">
                  {sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Whiteboard area */}
        <div
          className={`flex-1 overflow-hidden ${
            viewMode === 'split' ? 'border-r border-[var(--vl-border)]' : ''
          } ${viewMode === 'discussion' ? 'hidden' : ''}`}
        >
          <WhiteboardCanvas canvasId={`meeting-${meetingId}`} lang={lang} />
        </div>

        {/* Sidebar: Discussion / Meeting context */}
        {viewMode !== 'whiteboard' && (
          <AnimatePresence>
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{
                width: sidebarCollapsed && viewMode === 'split' ? 0 : viewMode === 'discussion' ? '100%' : 360,
                opacity: 1,
              }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="overflow-hidden flex flex-col"
            >
              {(!sidebarCollapsed || viewMode === 'discussion') && (
                <div className="w-full max-w-[360px] flex flex-col h-full">
                  {/* Meeting context bar */}
                  <div className="p-2 border-b border-[var(--vl-border-subtle)] bg-[var(--vl-bg-inner)]/30">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Users className="size-3.5 text-emerald-400" />
                      <span className="text-[10px] font-medium vl-text-heading">Participants</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {participants.map(p => (
                        <div key={p.id} className="flex items-center gap-1">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ backgroundColor: p.color }}>
                            {p.name.charAt(0)}
                          </div>
                          <span className="text-[10px] vl-text-body">{p.name}</span>
                          {p.role && <span className="text-[9px] vl-text-muted">({p.role})</span>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Meeting Notes Template (quick reference) */}
                  <div className="p-2 border-b border-[var(--vl-border-subtle)]">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <BookOpen className="size-3.5 text-amber-400" />
                      <span className="text-[10px] font-medium vl-text-heading">Meeting Notes</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {notesSections.map(section => (
                        <div key={section.label} className="vl-inner rounded p-1.5 text-center">
                          <section.icon className="size-3 mx-auto mb-0.5 text-emerald-400" />
                          <span className="text-[9px] vl-text-muted">{section.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Messages */}
                  <ScrollArea className="flex-1">
                    <div className="p-2 space-y-2 scrollbar-thin">
                      {messageGroups.map(([round, msgs]) => (
                        <div key={round}>
                          <div className="flex items-center gap-1 mb-1">
                            <Badge variant="secondary" className="text-[8px] px-1 h-3 bg-emerald-500/10 text-emerald-400">
                              R{round}
                            </Badge>
                            <div className="flex-1 h-px bg-[var(--vl-border-subtle)]" />
                          </div>
                          <div className="space-y-1.5">
                            {msgs.map(msg => (
                              <div
                                key={msg.id}
                                className="vl-inner rounded-lg p-2 border-l-2 group hover:bg-[var(--vl-bg-card-hover)] transition-colors cursor-default"
                                style={{ borderLeftColor: getParticipantColor(msg.agentName) }}
                              >
                                <div className="flex items-center gap-1 mb-0.5">
                                  <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: getParticipantColor(msg.agentName) }} />
                                  <span className="text-[10px] font-medium" style={{ color: getParticipantColor(msg.agentName) }}>
                                    {msg.agentName}
                                  </span>
                                </div>
                                <p className="text-[11px] vl-text-body leading-relaxed line-clamp-4">{msg.content}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}

export default MeetingWhiteboardTab
