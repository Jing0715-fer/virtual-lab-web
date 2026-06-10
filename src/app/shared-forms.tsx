'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { X, Plus, ChevronRight, Zap, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import type { Agent } from './shared-types'
import { AGENT_TEMPLATES, AGENT_COLOR_OPTIONS, AGENT_ICON_OPTIONS, MODEL_OPTIONS } from './shared-types'
import { renderAgentIcon } from './shared-components'

// ============================================================
// Agent Form Component
// ============================================================

export function AgentForm({ agent, agents, onSave, onCancel, lang }: {
  agent?: Agent | null
  agents: Agent[]
  onSave: (data: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>) => void
  onCancel: () => void
  lang: Lang
}) {
  const [title, setTitle] = useState(agent?.title || '')
  const [expertise, setExpertise] = useState(agent?.expertise || '')
  const [goal, setGoal] = useState(agent?.goal || '')
  const [role, setRole] = useState(agent?.role || '')
  const [model, setModel] = useState(agent?.model || 'gpt-4o')
  const [color, setColor] = useState(agent?.color || AGENT_COLOR_OPTIONS[0])
  const [icon, setIcon] = useState(agent?.icon || 'bot')

  const handleSubmit = () => {
    if (!title.trim() || !expertise.trim() || !goal.trim() || !role.trim()) {
      toast.error('Please fill in all required fields')
      return
    }
    onSave({ title, expertise, goal, role, model, color, icon })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="vl-text-label text-sm flex items-center gap-1.5">
          Title *{title.trim() && <CheckCircle2 className="size-3 text-emerald-400" />}
        </Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Principal Investigator" className="vl-input min-h-[44px]" />
      </div>
      <div className="space-y-2">
        <Label className="vl-text-label text-sm flex items-center gap-1.5">
          Expertise *{expertise.trim() && <CheckCircle2 className="size-3 text-emerald-400" />}
        </Label>
        <Input value={expertise} onChange={(e) => setExpertise(e.target.value)} placeholder="e.g., Running a science research lab" className="vl-input min-h-[44px]" />
      </div>
      <div className="space-y-2">
        <Label className="vl-text-label text-sm flex items-center gap-1.5">
          Goal *{goal.trim() && <CheckCircle2 className="size-3 text-emerald-400" />}
        </Label>
        <Input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g., Perform research that maximizes impact" className="vl-input min-h-[44px]" />
      </div>
      <div className="space-y-2">
        <Label className="vl-text-label text-sm flex items-center gap-1.5">
          Role *{role.trim() && <CheckCircle2 className="size-3 text-emerald-400" />}
        </Label>
        <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g., Lead a team of experts" className="vl-input min-h-[44px]" />
      </div>
      <div className="space-y-2">
        <Label className="vl-text-label text-sm">Model</Label>
        <Select value={model} onValueChange={setModel}>
          <SelectTrigger className="vl-input w-full min-h-[44px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="vl-dialog">
            {MODEL_OPTIONS.map(m => (
              <SelectItem key={m} value={m} className="vl-text-heading focus:bg-[var(--vl-bg-card-hover)]">{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="vl-text-label text-sm">Color</Label>
        <div className="flex gap-2 flex-wrap">
          {AGENT_COLOR_OPTIONS.map(c => (
            <button
              key={c}
              type="button"
              className={`w-8 h-8 rounded-full transition-all ${color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[var(--vl-bg-secondary)] scale-110' : 'hover:scale-105'}`}
              style={{ backgroundColor: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Label className="vl-text-label text-sm">Icon</Label>
        <div className="flex gap-2 flex-wrap">
          {AGENT_ICON_OPTIONS.map(({ value, label, Icon: I }) => (
            <button
              key={value}
              type="button"
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${icon === value ? 'bg-emerald-500/20 ring-2 ring-emerald-500' : 'bg-[var(--vl-bg-inner)] hover:bg-[var(--vl-bg-card-hover)]'}`}
              onClick={() => setIcon(value)}
              title={label}
            >
              <I className="size-4 text-white" />
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <Button onClick={handleSubmit} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px]">
          {agent ? t(lang, 'agents.edit') : t(lang, 'agents.create')}
        </Button>
        <Button onClick={onCancel} variant="outline" className="border-[var(--vl-border)] vl-text-body hover:bg-[var(--vl-bg-card-hover)]">
          {t(lang, 'common.cancel')}
        </Button>
      </div>
    </div>
  )
}

// ============================================================
// Agent Template Dialog
// ============================================================

export function AgentTemplateDialog({ open, onOpenChange, onSelect }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (template: typeof AGENT_TEMPLATES[0]) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="vl-dialog sm:max-w-md max-h-[85vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ color: 'var(--vl-text-white)' }}>
            <Zap className="size-4 text-amber-400" /> Agent Templates
          </DialogTitle>
          <DialogDescription className="vl-text-muted">Quick-create an agent from a pre-defined template</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          {AGENT_TEMPLATES.map((tmpl) => (
            <motion.button
              key={tmpl.title}
              whileHover={{ scale: 1.01, x: 4 }}
              whileTap={{ scale: 0.99 }}
              className="w-full text-left vl-card border rounded-xl p-4 hover:border-emerald-500/30 hover:shadow-[0_0_15px_rgba(16,185,129,0.1)] transition-all duration-200"
              onClick={() => { onSelect(tmpl); onOpenChange(false) }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: tmpl.color }}
                >
                  {renderAgentIcon(tmpl.icon, 'size-5 text-white')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--vl-text-white)' }}>{tmpl.title}</p>
                  <p className="text-xs vl-text-muted truncate">{tmpl.expertise}</p>
                </div>
                <ChevronRight className="size-4 vl-text-muted shrink-0" />
              </div>
            </motion.button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Dynamic List Component (for Questions/Rules)
// ============================================================

export function DynamicList({ items, onChange, placeholder, label }: {
  items: string[]
  onChange: (items: string[]) => void
  placeholder: string
  label: string
}) {
  const addItem = () => onChange([...items, ''])
  const removeItem = (index: number) => onChange(items.filter((_, i) => i !== index))
  const updateItem = (index: number, value: string) => onChange(items.map((item, i) => i === index ? value : item))

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="vl-text-label text-sm">{label}</Label>
        <Button type="button" variant="ghost" size="sm" className="h-7 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10" onClick={addItem}>
          <Plus className="size-3.5 mr-1" /> Add
        </Button>
      </div>
      <AnimatePresence>
        {items.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex gap-2"
          >
            <Input
              value={item}
              onChange={(e) => updateItem(index, e.target.value)}
              placeholder={placeholder}
              className="vl-input text-sm min-h-[44px]"
            />
            <Button type="button" variant="ghost" size="sm" className="h-9 w-9 p-0 vl-text-muted hover:text-red-400 hover:bg-red-500/10" onClick={() => removeItem(index)} aria-label={`Remove item ${index + 1}`}>
              <X className="size-3.5" />
            </Button>
          </motion.div>
        ))}
      </AnimatePresence>
      {items.length === 0 && (
        <p className="text-xs vl-text-muted italic">No {label.toLowerCase()} added yet</p>
      )}
    </div>
  )
}
