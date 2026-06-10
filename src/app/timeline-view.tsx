'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Calendar, MessageSquare, Clock, Users, Bot as BotIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Agent, Meeting } from './shared-components'
import type { Lang } from '@/lib/i18n'
import { t } from '@/lib/i18n'
import { getTimeAgo } from './shared-components'

interface MeetingTimelineViewProps {
  meetings: Meeting[]
  agents: Agent[]
  selectedMeetingId: string | null
  onSelectMeeting: (meeting: Meeting) => void
  lang: Lang
}

export function MeetingTimelineView({
  meetings,
  agents,
  selectedMeetingId,
  onSelectMeeting,
  lang,
}: MeetingTimelineViewProps) {
  // Sort meetings chronologically (newest first)
  const sortedMeetings = [...meetings].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  const statusDotColor = (status: Meeting['status']) => {
    switch (status) {
      case 'completed':
        return { bg: 'bg-emerald-500', border: 'border-emerald-400', shadow: 'shadow-[0_0_8px_rgba(16,185,129,0.4)]' }
      case 'running':
        return { bg: 'bg-amber-500', border: 'border-amber-400', shadow: 'shadow-[0_0_8px_rgba(245,158,11,0.4)]' }
      case 'draft':
        return { bg: 'bg-gray-500', border: 'border-gray-400', shadow: '' }
      default:
        return { bg: 'bg-gray-500', border: 'border-gray-400', shadow: '' }
    }
  }

  const statusBadgeColor = (status: Meeting['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
      case 'running':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30'
      case 'draft':
        return 'bg-[var(--vl-status-draft-bg)]/10 text-[var(--vl-text-muted)] border-[var(--vl-status-draft-border)]'
      default:
        return ''
    }
  }

  // Get unique participant agent names from messages
  const getParticipants = (meeting: Meeting): string[] => {
    return [...new Set((meeting.messages || []).map(m => m.agentName).filter(n => n !== 'User'))]
  }

  // Empty state
  if (sortedMeetings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 vl-float-animation">
          <Calendar className="size-8 text-emerald-400" />
        </div>
        <h3 className="text-lg font-semibold vl-text-heading mb-1">
          {t(lang, 'history.timeline.noMeetings')}
        </h3>
        <p className="text-sm vl-text-muted text-center max-w-sm">
          {t(lang, 'timeline.emptyDesc')}
        </p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Timeline header */}
      <div className="flex items-center gap-2 mb-6">
        <Clock className="size-4 text-emerald-400" />
        <h3 className="text-sm font-semibold vl-text-heading">
          {t(lang, 'history.timeline.title')}
        </h3>
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] ml-auto">
          {sortedMeetings.length} {lang === 'zh' ? '个会议' : 'meetings'}
        </Badge>
      </div>

      {/* Timeline container with scroll */}
      <div className="h-[600px] overflow-y-auto pr-2 custom-scrollbar">
        <div className="relative px-4 sm:px-8">
          {/* Gradient spine (centered for alternating layout) */}
          <div
            className="absolute left-1/2 top-0 bottom-0 w-[3px] rounded-full -translate-x-1/2 hidden md:block"
            style={{
              background: 'linear-gradient(to bottom, #10b981, #06b6d4, #8b5cf6)',
              opacity: 0.35,
            }}
          />

          {/* Left-side spine for mobile */}
          <div
            className="absolute left-[15px] top-0 bottom-0 w-[3px] rounded-full md:hidden"
            style={{
              background: 'linear-gradient(to bottom, #10b981, #06b6d4, #8b5cf6)',
              opacity: 0.35,
            }}
          />

          {/* Meeting nodes */}
          <div className="space-y-8 pb-6">
            {sortedMeetings.map((meeting, idx) => {
              const participants = getParticipants(meeting)
              const messageCount = meeting.messages?.length || 0
              const isSelected = selectedMeetingId === meeting.id
              const isTeam = meeting.type === 'team'
              const isOdd = idx % 2 === 0 // odd index = left side (0-based)
              const dotColor = statusDotColor(meeting.status)
              const meetingName = meeting.saveName || (lang === 'zh' ? '无标题' : 'Untitled')

              return (
                <motion.div
                  key={meeting.id}
                  initial={{ opacity: 0, x: isOdd ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    delay: idx * 0.06,
                    duration: 0.4,
                    ease: [0.23, 1, 0.32, 1],
                  }}
                  className="relative"
                >
                  {/* ---- Desktop: Alternating left/right layout ---- */}
                  {/* Desktop center dot */}
                  <div
                    className={`absolute left-1/2 top-4 w-[15px] h-[15px] rounded-full border-[2.5px] z-10 -translate-x-1/2 hidden md:block ${dotColor.bg} ${dotColor.border} ${dotColor.shadow}`}
                  >
                    {meeting.status === 'running' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    )}
                  </div>

                  {/* Desktop cards — alternating sides */}
                  <div className={`hidden md:grid md:grid-cols-2 md:gap-8 items-start`}>
                    {/* Left slot */}
                    <div className={isOdd ? '' : 'md:col-start-2'}>
                      {isOdd && (
                        <div className="mr-4">
                          <TimelineCard
                            meeting={meeting}
                            meetingName={meetingName}
                            isTeam={isTeam}
                            isSelected={isSelected}
                            participants={participants}
                            messageCount={messageCount}
                            agents={agents}
                            statusBadgeColor={statusBadgeColor}
                            lang={lang}
                            onSelect={() => onSelectMeeting(meeting)}
                          />
                        </div>
                      )}
                    </div>

                    {/* Right slot */}
                    <div className={!isOdd ? 'md:col-start-2' : ''}>
                      {!isOdd && (
                        <div className="ml-4">
                          <TimelineCard
                            meeting={meeting}
                            meetingName={meetingName}
                            isTeam={isTeam}
                            isSelected={isSelected}
                            participants={participants}
                            messageCount={messageCount}
                            agents={agents}
                            statusBadgeColor={statusBadgeColor}
                            lang={lang}
                            onSelect={() => onSelectMeeting(meeting)}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ---- Mobile: All cards on right of spine ---- */}
                  <div className="md:hidden pl-10 relative">
                    {/* Mobile dot */}
                    <div
                      className={`absolute left-[9px] top-4 w-[13px] h-[13px] rounded-full border-[2.5px] z-10 ${dotColor.bg} ${dotColor.border} ${dotColor.shadow}`}
                    >
                      {meeting.status === 'running' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                      )}
                    </div>
                    {/* Connecting line */}
                    <div className="absolute left-[23px] top-[19px] w-4 h-px bg-emerald-500/30" />

                    <TimelineCard
                      meeting={meeting}
                      meetingName={meetingName}
                      isTeam={isTeam}
                      isSelected={isSelected}
                      participants={participants}
                      messageCount={messageCount}
                      agents={agents}
                      statusBadgeColor={statusBadgeColor}
                      lang={lang}
                      onSelect={() => onSelectMeeting(meeting)}
                    />
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* End cap */}
          <div className="hidden md:block">
            <div
              className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-[7px] h-[7px] rounded-full"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
                opacity: 0.5,
              }}
            />
          </div>
          <div className="md:hidden">
            <div
              className="absolute left-[10px] -bottom-1 w-[7px] h-[7px] rounded-full"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
                opacity: 0.5,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Timeline Card — extracted for reuse in both desktop and mobile
// ============================================================

function TimelineCard({
  meeting,
  meetingName,
  isTeam,
  isSelected,
  participants,
  messageCount,
  agents,
  statusBadgeColor,
  lang,
  onSelect,
}: {
  meeting: Meeting
  meetingName: string
  isTeam: boolean
  isSelected: boolean
  participants: string[]
  messageCount: number
  agents: Agent[]
  statusBadgeColor: (status: Meeting['status']) => string
  lang: Lang
  onSelect: () => void
}) {
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleTimeString(lang === 'zh' ? 'zh-CN' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Card
      className={`vl-card card-hover-3d backdrop-blur-sm cursor-pointer transition-all duration-300 ${
        isSelected
          ? 'border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.2),0_0_40px_rgba(16,185,129,0.08)] ring-1 ring-emerald-500/30'
          : 'hover:shadow-[0_0_20px_rgba(16,185,129,0.1)] hover:border-emerald-500/30'
      }`}
      onClick={onSelect}
    >
      <CardContent className="p-3.5">
        {/* Top row: badges and date */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge
              variant="outline"
              className={`${isTeam ? 'bg-emerald-600/70 text-white border-emerald-500/50' : 'bg-cyan-600/70 text-white border-cyan-500/50'} text-[9px] px-1.5 py-0`}
            >
              {isTeam ? (lang === 'zh' ? '团队' : 'Team') : (lang === 'zh' ? '个人' : 'Individual')}
            </Badge>
            <Badge
              variant="outline"
              className={`${statusBadgeColor(meeting.status)} text-[9px] px-1.5 py-0`}
            >
              {meeting.status === 'running' && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block mr-0.5" />
              )}
              {meeting.status}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5 ml-2 shrink-0">
            <span className="text-[10px] vl-text-muted whitespace-nowrap">
              {formatDate(meeting.createdAt)} {formatTime(meeting.createdAt)}
            </span>
            <span className="text-[9px] vl-text-muted">· {getTimeAgo(meeting.createdAt)}</span>
          </div>
        </div>

        {/* Meeting title */}
        <h4
          className={`text-sm font-medium vl-text-heading mb-1.5 leading-snug ${isSelected ? 'text-emerald-300' : ''}`}
        >
          {meetingName}
        </h4>

        {/* Agenda preview */}
        <p className="text-xs vl-text-body line-clamp-2 mb-2.5 leading-relaxed">
          {meeting.agenda}
        </p>

        {/* Bottom row: participants + stats */}
        <div className="flex items-center justify-between">
          {/* Agent participant avatars (overlapping circles) */}
          <div className="flex items-center gap-1">
            {participants.slice(0, 5).map((name, i) => {
              const agent = agents.find(a => a.title === name)
              return (
                <div
                  key={name + i}
                  className="w-5 h-5 rounded-full flex items-center justify-center text-white ring-1 ring-[var(--vl-border)] transition-transform hover:scale-110"
                  style={{
                    backgroundColor: agent?.color || '#6366f1',
                    marginLeft: i > 0 ? '-4px' : '0',
                    zIndex: participants.length - i,
                  }}
                  title={name}
                >
                  <span className="text-[7px] font-bold leading-none">{name.charAt(0).toUpperCase()}</span>
                </div>
              )
            })}
            {participants.length > 5 && (
              <span className="text-[9px] vl-text-muted ml-1">+{participants.length - 5}</span>
            )}
          </div>

          {/* Message count badge */}
          <div className="flex items-center gap-1.5">
            {isTeam && meeting.numRounds && (
              <span className="text-[9px] vl-text-muted">
                {meeting.numRounds} {lang === 'zh' ? '轮' : 'rounds'}
              </span>
            )}
            <Badge
              variant="outline"
              className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] px-1.5 py-0 gap-0.5"
            >
              <MessageSquare className="size-2.5" />
              {messageCount}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
