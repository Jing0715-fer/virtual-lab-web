'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Milestone, Plus, CheckCircle2, Check, Clock, AlertCircle, Trophy, Users, FlaskConical, X, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import type { Meeting, Agent } from './shared-components'

interface MilestoneItem {
  id: string
  name: string
  date: string
  status: 'completed' | 'upcoming' | 'overdue'
  icon: string
  isCustom?: boolean
}

function getStatusColor(status: MilestoneItem['status']): { bg: string; border: string; text: string; dot: string } {
  switch (status) {
    case 'completed':
      return { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', text: 'text-emerald-400', dot: 'bg-emerald-400' }
    case 'overdue':
      return { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', text: 'text-red-400', dot: 'bg-red-400' }
    default:
      return { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', text: 'text-amber-400', dot: 'bg-amber-400' }
  }
}

function getStatusLabel(status: MilestoneItem['status'], lang: Lang): string {
  switch (status) {
    case 'completed': return t(lang, 'dashboard.widgets.milestones.completed')
    case 'upcoming': return t(lang, 'dashboard.widgets.milestones.upcoming')
    case 'overdue': return t(lang, 'dashboard.widgets.milestones.overdue')
  }
}

export function MilestonesWidget({ lang, meetings, agents }: { lang: Lang; meetings: Meeting[]; agents: Agent[] }) {
  const [customMilestones, setCustomMilestones] = useState<MilestoneItem[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDate, setNewDate] = useState('')
  const [selectedMilestone, setSelectedMilestone] = useState<string | null>(null)

  const autoMilestones = useMemo(() => {
    const items: MilestoneItem[] = []
    const completedMeetings = meetings.filter(m => m.status === 'completed')
    const firstMeeting = completedMeetings.length > 0 ? completedMeetings[0] : null

    // First meeting milestone
    if (firstMeeting) {
      items.push({
        id: 'auto-first-meeting',
        name: t(lang, 'dashboard.widgets.milestones.firstMeeting'),
        date: firstMeeting.createdAt.split('T')[0],
        status: 'completed',
        icon: 'FlaskConical',
      })
    }

    // Agent count milestones
    const agentCounts = [3, 5, 10]
    const reached: number[] = []
    agentCounts.forEach(target => {
      if (agents.length >= target) reached.push(target)
    })
    reached.forEach(count => {
      const existing = items.find(m => m.id === `auto-${count}-agents`)
      if (!existing) {
        items.push({
          id: `auto-${count}-agents`,
          name: t(lang, 'dashboard.widgets.milestones.agentCount').replace('{count}', String(count)),
          date: agents.slice(0, count).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[count - 1]?.createdAt.split('T')[0] || '',
          status: 'completed',
          icon: 'Users',
        })
      }
    })

    // Upcoming: 10 agents
    if (agents.length < 10) {
      items.push({
        id: 'auto-10-agents-upcoming',
        name: t(lang, 'dashboard.widgets.milestones.tenAgents'),
        date: '',
        status: 'upcoming',
        icon: 'Users',
      })
    }

    // Meeting count milestones: 5, 10
    const meetingTargets = [5, 10]
    meetingTargets.forEach(target => {
      if (completedMeetings.length >= target) {
        const m = completedMeetings[target - 1]
        items.push({
          id: `auto-${target}-meetings`,
          name: `${target} ${t(lang, 'common.meetings')} ${t(lang, 'dashboard.widgets.milestones.completed')}`,
          date: m.createdAt.split('T')[0],
          status: 'completed',
          icon: 'Trophy',
        })
      } else {
        items.push({
          id: `auto-${target}-meetings-upcoming`,
          name: `${target} ${t(lang, 'common.meetings')}`,
          date: '',
          status: 'upcoming',
          icon: 'Trophy',
        })
      }
    })

    return items
  }, [meetings, agents, lang])

  const allMilestones = useMemo(() => {
    return [...autoMilestones, ...customMilestones].sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : Infinity
      const dateB = b.date ? new Date(b.date).getTime() : Infinity
      return dateA - dateB
    })
  }, [autoMilestones, customMilestones])

  const completedCount = allMilestones.filter(m => m.status === 'completed').length
  const progressPct = allMilestones.length > 0 ? Math.round((completedCount / allMilestones.length) * 100) : 0

  const handleAddMilestone = useCallback(() => {
    if (!newName.trim()) return
    const today = new Date().toISOString().split('T')[0]
    const date = newDate || today
    const isOverdue = new Date(date) < new Date(today)
    const newItem: MilestoneItem = {
      id: `custom-${Date.now()}`,
      name: newName.trim(),
      date,
      status: isOverdue ? 'overdue' : 'upcoming',
      icon: 'Milestone',
      isCustom: true,
    }
    setCustomMilestones(prev => [...prev, newItem])
    setNewName('')
    setNewDate('')
    setShowAddForm(false)
  }, [newName, newDate])

  const getMilestoneIcon = (icon: string) => {
    switch (icon) {
      case 'FlaskConical': return FlaskConical
      case 'Users': return Users
      case 'Trophy': return Trophy
      default: return Milestone
    }
  }

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] vl-text-muted">{t(lang, 'dashboard.widgets.milestones.progress')}</span>
          <span className="text-[10px] font-medium vl-text-heading">{progressPct}%</span>
        </div>
        <div className="h-1.5 rounded-full" style={{ background: 'var(--vl-bg-inner)' }}>
          <motion.div
            className="h-full rounded-full bg-emerald-500"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Timeline */}
      {allMilestones.length === 0 ? (
        <div className="vl-inner rounded-xl py-8 flex flex-col items-center justify-center">
          <Milestone className="size-8 vl-text-muted mb-2 vl-float-animation" />
          <p className="text-xs vl-text-muted">{t(lang, 'dashboard.widgets.milestones.noMilestones')}</p>
          <p className="text-[10px] vl-text-muted mt-1">{t(lang, 'dashboard.widgets.milestones.noMilestonesDesc')}</p>
        </div>
      ) : (
        <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
          <div className="relative pl-6 space-y-1">
            {/* Timeline line */}
            <div className="absolute left-[9px] top-2 bottom-2 w-px milestone-line" style={{ background: 'var(--vl-border)' }} />

            {allMilestones.map((milestone) => {
              const colors = getStatusColor(milestone.status)
              const Icon = getMilestoneIcon(milestone.icon)
              const isSelected = selectedMilestone === milestone.id

              return (
                <div key={milestone.id} className="relative">
                  {/* Node */}
                  <div className="absolute -left-6 top-1">
                    <div
                      className={`milestone-node w-[18px] h-[18px] rounded-full flex items-center justify-center ${colors.dot}`}
                      onClick={() => setSelectedMilestone(isSelected ? null : milestone.id)}
                    >
                      <Icon className="size-2.5 text-white" />
                    </div>
                  </div>

                  {/* Card */}
                  <motion.div
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25 }}
                    className={`ml-1 p-2 rounded-lg border cursor-pointer transition-all ${isSelected ? 'ring-1 ring-emerald-500/50' : ''}`}
                    style={{ background: colors.bg, borderColor: colors.border }}
                    onClick={() => setSelectedMilestone(isSelected ? null : milestone.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium vl-text-heading flex-1 truncate">{milestone.name}</span>
                      <span className={`text-[9px] font-medium ${colors.text}`}>{getStatusLabel(milestone.status, lang)}</span>
                    </div>
                    {milestone.date && (
                      <span className="text-[9px] vl-text-muted flex items-center gap-1 mt-0.5">
                        <CalendarDays className="size-2.5" />
                        {milestone.date}
                      </span>
                    )}

                    {/* Detail panel */}
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="milestone-detail vl-inner rounded-md mt-2 p-2">
                            <div className="flex items-center gap-2 text-[10px]">
                              <span className="vl-text-muted">Status:</span>
                              <span className={colors.text}>{getStatusLabel(milestone.status, lang)}</span>
                            </div>
                            {milestone.date && (
                              <div className="flex items-center gap-2 text-[10px] mt-1">
                                <span className="vl-text-muted">Date:</span>
                                <span className="vl-text-body">{milestone.date}</span>
                              </div>
                            )}
                            {milestone.isCustom && (
                              <button
                                onClick={e => {
                                  e.stopPropagation()
                                  setCustomMilestones(prev => prev.filter(m => m.id !== milestone.id))
                                  setSelectedMilestone(null)
                                }}
                                className="text-[10px] text-rose-400 hover:text-rose-300 mt-1 flex items-center gap-1"
                              >
                                <X className="size-3" />
                                Remove
                              </button>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Add milestone */}
      {showAddForm ? (
        <div className="vl-inner rounded-lg p-2.5 space-y-2">
          <Input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder={t(lang, 'dashboard.widgets.milestones.milestoneName')}
            className="vl-input h-7 text-xs rounded-md"
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              className="vl-input h-7 text-xs rounded-md flex-1 px-2"
            />
            <Button size="sm" onClick={handleAddMilestone} className="h-7 px-2 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-md">
              <Check className="size-3" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)} className="h-7 px-2 text-[10px] rounded-md">
              <X className="size-3 vl-text-muted" />
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddForm(true)}
          className="w-full h-7 text-[10px] border-[var(--vl-border)] vl-text-body hover:bg-[var(--vl-bg-inner)] rounded-lg gap-1"
        >
          <Plus className="size-3" />
          {t(lang, 'dashboard.widgets.milestones.addMilestone')}
        </Button>
      )}
    </div>
  )
}
