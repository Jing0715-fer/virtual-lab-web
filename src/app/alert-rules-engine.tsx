'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  Zap, Plus, Trash2, Edit2, Play, Check, X, ChevronRight,
  ChevronLeft, Settings, Bell, BellOff, Mail, ClipboardList, MessageSquare,
  GitBranch, Webhook, Brain, Calendar, Timer, Users, FileText,
  ArrowRight, AlertTriangle, CheckCircle2, Clock, Shield,
  Bot, Filter, Sparkles, RefreshCw, Send,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

// ============================================================
// Types
// ============================================================

interface RuleTrigger {
  type: 'meeting_completed' | 'meeting_duration' | 'agent_messages' | 'meeting_created' | 'pipeline_stage' | 'custom'
  condition?: string
  value?: number | string
}

interface RuleAction {
  type: 'notification' | 'email' | 'follow_up_task' | 'meeting_notes' | 'webhook' | 'automated_analysis'
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  params?: Record<string, string>
}

interface AlertRule {
  id: string
  name: string
  description: string
  enabled: boolean
  trigger: RuleTrigger
  action: RuleAction
  createdAt: string
  updatedAt: string
  isTemplate?: boolean
}

interface TestResult {
  success: boolean
  triggered: boolean
  reason: string
  timestamp: string
}

type WizardStep = 'trigger' | 'condition' | 'action' | 'confirm'

interface AlertRulesEngineProps {
  lang?: Lang
}

// ============================================================
// Constants & Templates
// ============================================================

const RULES_KEY = 'vl-alert-rules'

const TRIGGER_OPTIONS = [
  { type: 'meeting_completed' as const, label: 'Meeting Completed', labelZh: '会议完成', icon: CheckCircle2, color: '#10b981', desc: 'Any meeting finishes', descZh: '任何会议结束' },
  { type: 'meeting_duration' as const, label: 'Meeting Duration', labelZh: '会议时长', icon: Timer, color: '#06b6d4', desc: 'Duration exceeds threshold', descZh: '时长超过阈值' },
  { type: 'agent_messages' as const, label: 'Agent Messages', labelZh: '智能体消息', icon: Bot, color: '#8b5cf6', desc: 'Agent sends X+ messages', descZh: '智能体发送X+条消息' },
  { type: 'meeting_created' as const, label: 'Meeting Created', labelZh: '会议创建', icon: Plus, color: '#f59e0b', desc: 'New meeting is created', descZh: '创建新会议' },
  { type: 'pipeline_stage' as const, label: 'Pipeline Stage', labelZh: '流水线阶段', icon: GitBranch, color: '#ec4899', desc: 'Pipeline stage completed/failed', descZh: '流水线阶段完成/失败' },
  { type: 'custom' as const, label: 'Custom Event', labelZh: '自定义事件', icon: Webhook, color: '#64748b', desc: 'Any API event', descZh: '任何API事件' },
]

const ACTION_OPTIONS = [
  { type: 'notification' as const, label: 'Show Notification', labelZh: '显示通知', icon: Bell, color: '#10b981', desc: 'Display in-app notification', descZh: '显示应用内通知' },
  { type: 'email' as const, label: 'Send Email', labelZh: '发送邮件', icon: Mail, color: '#f59e0b', desc: 'Send email notification', descZh: '发送邮件通知' },
  { type: 'follow_up_task' as const, label: 'Create Follow-up Task', labelZh: '创建跟进任务', icon: ClipboardList, color: '#8b5cf6', desc: 'Auto-create a task', descZh: '自动创建任务' },
  { type: 'meeting_notes' as const, label: 'Add to Meeting Notes', labelZh: '添加到会议笔记', icon: FileText, color: '#06b6d4', desc: 'Auto-log in meeting notes', descZh: '自动记录到会议笔记' },
  { type: 'webhook' as const, label: 'Trigger Webhook', labelZh: '触发Webhook', icon: Webhook, color: '#ec4899', desc: 'Send to external endpoint', descZh: '发送到外部端点' },
  { type: 'automated_analysis' as const, label: 'Run Analysis', labelZh: '运行分析', icon: Brain, color: '#f97316', desc: 'Automated analysis run', descZh: '自动分析运行' },
]

const PRIORITY_OPTIONS = [
  { value: 'low' as const, label: 'Low', labelZh: '低' },
  { value: 'medium' as const, label: 'Medium', labelZh: '中' },
  { value: 'high' as const, label: 'High', labelZh: '高' },
  { value: 'urgent' as const, label: 'Urgent', labelZh: '紧急' },
]

const BUILT_IN_TEMPLATES: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Notify when any meeting completes',
    description: 'Receive a notification whenever any team or individual meeting finishes.',
    enabled: true, isTemplate: true,
    trigger: { type: 'meeting_completed' },
    action: { type: 'notification', priority: 'medium' },
  },
  {
    name: 'Alert if meeting exceeds 30 minutes',
    description: 'Get a high-priority alert when a meeting runs longer than 30 minutes.',
    enabled: true, isTemplate: true,
    trigger: { type: 'meeting_duration', condition: '>', value: 30 },
    action: { type: 'notification', priority: 'high' },
  },
  {
    name: 'Summary when agent sends 10+ messages',
    description: 'Generate a summary notification when an agent sends more than 10 messages.',
    enabled: false, isTemplate: true,
    trigger: { type: 'agent_messages', condition: '>', value: 10 },
    action: { type: 'notification', priority: 'low' },
  },
  {
    name: 'Weekly digest every Monday',
    description: 'Receive a weekly email digest summarizing your research activity.',
    enabled: true, isTemplate: true,
    trigger: { type: 'custom', condition: 'schedule', value: 'weekly-monday' },
    action: { type: 'email', priority: 'low' },
  },
  {
    name: 'Urgent alert for pipeline failures',
    description: 'Get an urgent notification immediately when any pipeline stage fails.',
    enabled: true, isTemplate: true,
    trigger: { type: 'pipeline_stage', condition: 'failed' },
    action: { type: 'notification', priority: 'urgent' },
  },
]

const INITIAL_RULES: AlertRule[] = BUILT_IN_TEMPLATES.map((t, i) => ({
  ...t,
  id: `rule-${i + 1}`,
  createdAt: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
  updatedAt: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
}))

// ============================================================
// Helpers
// ============================================================

function useRulesState() {
  const [rules, setRules] = useState<AlertRule[]>(() => {
    if (typeof window === 'undefined') return INITIAL_RULES
    try {
      const stored = localStorage.getItem(RULES_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch { /* ignore */ }
    return INITIAL_RULES
  })
  const [hydrated] = useState(typeof window !== 'undefined')

  const updateRules = useCallback((updater: (prev: AlertRule[]) => AlertRule[]) => {
    setRules(prev => {
      const next = updater(prev)
      try { localStorage.setItem(RULES_KEY, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }, [])

  return [hydrated ? rules : INITIAL_RULES, updateRules] as const
}

function getTriggerLabel(trigger: RuleTrigger, lang: Lang): string {
  const opt = TRIGGER_OPTIONS.find(o => o.type === trigger.type)
  const base = opt ? (lang === 'zh' ? opt.labelZh : opt.label) : trigger.type
  if (trigger.type === 'meeting_duration' && trigger.value) {
    return `${base} ${trigger.condition || '>'} ${trigger.value} min`
  }
  if (trigger.type === 'agent_messages' && trigger.value) {
    return `${base} ${trigger.condition || '>'} ${trigger.value}`
  }
  if (trigger.type === 'custom' && trigger.value) {
    return `${base}: ${trigger.value}`
  }
  return base
}

function getActionLabel(action: RuleAction, lang: Lang): string {
  const opt = ACTION_OPTIONS.find(o => o.type === action.type)
  const base = opt ? (lang === 'zh' ? opt.labelZh : opt.label) : action.type
  if (action.priority && action.type === 'notification') {
    return `${base} (${action.priority})`
  }
  return base
}

// ============================================================
// Sub-Components
// ============================================================

// ── Rule Card ──

function RuleCard({
  rule,
  onToggle,
  onEdit,
  onDelete,
  onTest,
  testResult,
  lang,
}: {
  rule: AlertRule
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onTest: () => void
  testResult?: TestResult
  lang: Lang
}) {
  const triggerOpt = TRIGGER_OPTIONS.find(o => o.type === rule.trigger.type)
  const actionOpt = ACTION_OPTIONS.find(o => o.type === rule.action.type)
  const TriggerIcon = useMemo(() => triggerOpt?.icon || Zap, [triggerOpt])
  const ActionIcon = useMemo(() => actionOpt?.icon || Bell, [actionOpt])

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`are-rule-card are-card-animated ${!rule.enabled ? 'are-disabled' : ''}`}
    >
      {/* Top row: name + controls */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: `${triggerOpt?.color || '#10b981'}20` }}
          >
            <TriggerIcon className="size-4" style={{ color: triggerOpt?.color || '#10b981' }} />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-[var(--vl-text-white,#e2e8f0)] truncate">
              {rule.name}
            </h4>
            <p className="text-[10px] text-[var(--vl-text-muted,#64748b)] mt-0.5 line-clamp-1">
              {rule.description}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Switch
            checked={rule.enabled}
            onCheckedChange={onToggle}
            className="data-[state=checked]:bg-emerald-500 scale-90"
          />
          <div className="w-px h-4 bg-[var(--vl-border,rgba(255,255,255,0.08))]" />
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-[var(--vl-text-muted,#64748b)] hover:text-emerald-400" onClick={onTest} aria-label="Test rule">
            <Play className="size-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-[var(--vl-text-muted,#64748b)] hover:text-white" onClick={onEdit} aria-label="Edit rule">
            <Edit2 className="size-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-[var(--vl-text-muted,#64748b)] hover:text-red-400" onClick={onDelete} aria-label="Delete rule">
            <Trash2 className="size-3" />
          </Button>
        </div>
      </div>

      {/* IF/THEN Visual Flow */}
      <div className="are-flow-container">
        <div className="are-flow-block are-flow-if">
          <div className="are-flow-label">{lang === 'zh' ? '如果' : 'IF'}</div>
          <div className="are-flow-content">
            <div className="flex items-center justify-center gap-1.5">
              <TriggerIcon className="size-3" style={{ color: '#34d399' }} />
              <span className="text-[11px]">{getTriggerLabel(rule.trigger, lang)}</span>
            </div>
          </div>
        </div>
        <div className="are-flow-connector">
          <div className="are-flow-arrow">
            <ArrowRight className="size-3" />
          </div>
        </div>
        <div className="are-flow-block are-flow-then">
          <div className="are-flow-label">{lang === 'zh' ? '那么' : 'THEN'}</div>
          <div className="are-flow-content">
            <div className="flex items-center justify-center gap-1.5">
              <ActionIcon className="size-3" style={{ color: '#fbbf24' }} />
              <span className="text-[11px]">{getActionLabel(rule.action, lang)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Test Result */}
      {testResult && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className={`are-test-result ${testResult.triggered ? 'are-test-pass' : 'are-test-fail'}`}
        >
          <div className="flex items-center gap-2">
            {testResult.triggered ? (
              <CheckCircle2 className="size-4" />
            ) : (
              <AlertTriangle className="size-4" />
            )}
            <div>
              <p className="text-xs font-medium">{testResult.triggered ? (lang === 'zh' ? '规则触发成功' : 'Rule triggered successfully') : (lang === 'zh' ? '规则未触发' : 'Rule did not trigger')}</p>
              <p className="text-[10px] opacity-70 mt-0.5">{testResult.reason}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Template badge */}
      {rule.isTemplate && (
        <div className="mt-2">
          <Badge className="text-[9px] px-1.5 py-0 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            {lang === 'zh' ? '内置模板' : 'Built-in'}
          </Badge>
        </div>
      )}

      {/* Timestamp */}
      <div className="mt-2 flex items-center gap-1 text-[9px] text-[var(--vl-text-muted,#64748b)]">
        <Clock className="size-2.5" />
        {lang === 'zh' ? '更新于' : 'Updated'} {new Date(rule.updatedAt).toLocaleDateString()}
      </div>
    </motion.div>
  )
}

// ── Rule Wizard ──

function RuleWizard({
  lang,
  onComplete,
  onCancel,
  editRule,
}: {
  lang: Lang
  onComplete: (rule: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>) => void
  onCancel: () => void
  editRule?: AlertRule | null
}) {
  const [step, setStep] = useState<WizardStep>('trigger')
  const [name, setName] = useState(editRule?.name || '')
  const [description, setDescription] = useState(editRule?.description || '')
  const [trigger, setTrigger] = useState<RuleTrigger>(editRule?.trigger || { type: 'meeting_completed' })
  const [action, setAction] = useState<RuleAction>(editRule?.action || { type: 'notification', priority: 'medium' })
  const [conditionValue, setConditionValue] = useState(editRule?.trigger?.value?.toString() || '')
  const [conditionOp, setConditionOp] = useState(editRule?.trigger?.condition || '>')
  const [webhookUrl, setWebhookUrl] = useState(editRule?.action?.params?.url || '')

  const steps: WizardStep[] = ['trigger', 'condition', 'action', 'confirm']
  const stepIndex = steps.indexOf(step)

  const canNext = useMemo(() => {
    if (step === 'trigger') return true
    if (step === 'condition') {
      if (trigger.type === 'meeting_duration' || trigger.type === 'agent_messages') {
        return !!conditionValue && !isNaN(Number(conditionValue))
      }
      return true
    }
    if (step === 'action') return true
    if (step === 'confirm') return name.trim().length > 0
    return false
  }, [step, trigger.type, conditionValue, name])

  const handleNext = useCallback(() => {
    const nextIndex = Math.min(stepIndex + 1, steps.length - 1)
    if (step === 'condition') {
      if (trigger.type === 'meeting_duration' || trigger.type === 'agent_messages') {
        setTrigger(prev => ({ ...prev, condition: conditionOp, value: Number(conditionValue) }))
      } else if (trigger.type === 'custom') {
        setTrigger(prev => ({ ...prev, condition: 'custom', value: conditionValue || 'any' }))
      } else if (trigger.type === 'pipeline_stage') {
        setTrigger(prev => ({ ...prev, condition: 'completed' }))
      }
    }
    if (step === 'action' && action.type === 'webhook' && webhookUrl) {
      setAction(prev => ({ ...prev, params: { url: webhookUrl } }))
    }
    setStep(steps[nextIndex])
  }, [stepIndex, step, trigger.type, conditionOp, conditionValue, action.type, webhookUrl, steps])

  const handleBack = useCallback(() => {
    const prevIndex = Math.max(stepIndex - 1, 0)
    setStep(steps[prevIndex])
  }, [stepIndex, steps])

  const handleFinish = useCallback(() => {
    const finalTrigger = { ...trigger }
    if (trigger.type === 'meeting_duration' || trigger.type === 'agent_messages') {
      finalTrigger.condition = conditionOp
      finalTrigger.value = Number(conditionValue)
    }
    if (trigger.type === 'pipeline_stage' && !trigger.condition) {
      finalTrigger.condition = 'completed'
    }

    const finalAction = { ...action }
    if (action.type === 'webhook' && webhookUrl) {
      finalAction.params = { url: webhookUrl }
    }

    onComplete({
      name: name.trim(),
      description: description.trim() || `Auto-generated rule: ${getTriggerLabel(finalTrigger, lang)} → ${getActionLabel(finalAction, lang)}`,
      enabled: editRule?.enabled ?? true,
      trigger: finalTrigger,
      action: finalAction,
    })
  }, [name, description, trigger, action, conditionOp, conditionValue, webhookUrl, onComplete, lang, editRule])

  const stepLabels: Record<WizardStep, { en: string; zh: string }> = {
    trigger: { en: 'Trigger', zh: '触发条件' },
    condition: { en: 'Condition', zh: '条件设置' },
    action: { en: 'Action', zh: '执行动作' },
    confirm: { en: 'Confirm', zh: '确认' },
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-6"
    >
      {/* Step Indicator */}
      <div className="are-wizard-steps">
        {steps.map((s, i) => (
          <React.Fragment key={s}>
            <div className={`are-wizard-step ${i < stepIndex ? 'are-completed' : ''} ${i === stepIndex ? 'are-active' : ''}`}>
              <div className="are-wizard-dot">
                {i < stepIndex ? <Check className="size-3" /> : <span>{i + 1}</span>}
              </div>
            </div>
            {i < steps.length - 1 && <div className={`are-wizard-line ${i < stepIndex ? '' : ''}`} style={i < stepIndex ? { background: '#10b981' } : undefined} />}
          </React.Fragment>
        ))}
      </div>

      {/* Step Title */}
      <div className="text-center mb-6">
        <h3 className="text-sm font-semibold text-[var(--vl-text-white,#e2e8f0)]">
          {step === 'confirm' ? (lang === 'zh' ? '确认规则' : 'Confirm Rule') : `${lang === 'zh' ? '选择' : 'Select'} ${lang === 'zh' ? stepLabels[step].zh : stepLabels[step].en}`}
        </h3>
        <p className="text-[11px] text-[var(--vl-text-muted,#64748b)] mt-1">
          {step === 'trigger' && (lang === 'zh' ? '选择触发规则的事件类型' : 'Choose what event triggers this rule')}
          {step === 'condition' && (lang === 'zh' ? '配置触发条件参数' : 'Configure the trigger condition parameters')}
          {step === 'action' && (lang === 'zh' ? '选择触发后要执行的操作' : 'Choose the action to take when triggered')}
          {step === 'confirm' && (lang === 'zh' ? '检查并确认规则设置' : 'Review and confirm your rule settings')}
        </p>
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        {/* Step 1: Trigger */}
        {step === 'trigger' && (
          <motion.div key="trigger-step" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="are-select-grid">
            {TRIGGER_OPTIONS.map(opt => {
              const Icon = opt.icon
              return (
                <button
                  key={opt.type}
                  className={`are-select-option ${trigger.type === opt.type ? 'are-selected' : ''}`}
                  onClick={() => setTrigger({ type: opt.type })}
                >
                  <div className="are-select-icon" style={{ background: `${opt.color}20` }}>
                    <Icon className="size-4" style={{ color: opt.color }} />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-xs font-medium text-[var(--vl-text-white,#e2e8f0)]">
                      {lang === 'zh' ? opt.labelZh : opt.label}
                    </p>
                    <p className="text-[10px] text-[var(--vl-text-muted,#64748b)]">
                      {lang === 'zh' ? opt.descZh : opt.desc}
                    </p>
                  </div>
                  {trigger.type === opt.type && <Check className="size-4 text-emerald-400 shrink-0 ml-auto" />}
                </button>
              )
            })}
          </motion.div>
        )}

        {/* Step 2: Condition */}
        {step === 'condition' && (
          <motion.div key="condition-step" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            {(trigger.type === 'meeting_duration' || trigger.type === 'agent_messages') ? (
              <div className="p-4 rounded-xl bg-[var(--vl-bg-inner,rgba(255,255,255,0.04))] border border-[var(--vl-border-subtle,rgba(255,255,255,0.06))]">
                <p className="text-xs font-medium text-[var(--vl-text-white,#e2e8f0)] mb-3">
                  {trigger.type === 'meeting_duration'
                    ? (lang === 'zh' ? '会议时长超过多少分钟时触发' : 'Trigger when meeting duration exceeds')
                    : (lang === 'zh' ? '智能体发送多少条消息后触发' : 'Trigger when agent sends more than')}
                </p>
                <div className="flex items-center gap-3">
                  <select
                    className="are-condition-input"
                    style={{ width: '80px' }}
                    value={conditionOp}
                    onChange={(e) => setConditionOp(e.target.value)}
                  >
                    <option value=">">&gt;</option>
                    <option value=">=">&ge;</option>
                    <option value="<">&lt;</option>
                    <option value="<=">&le;</option>
                    <option value="==">=</option>
                  </select>
                  <input
                    type="number"
                    className="are-condition-input flex-1"
                    placeholder={trigger.type === 'meeting_duration' ? '30' : '10'}
                    value={conditionValue}
                    onChange={(e) => setConditionValue(e.target.value)}
                    min={0}
                  />
                  <span className="text-xs text-[var(--vl-text-muted,#64748b)]">
                    {trigger.type === 'meeting_duration' ? (lang === 'zh' ? '分钟' : 'minutes') : (lang === 'zh' ? '条消息' : 'messages')}
                  </span>
                </div>
              </div>
            ) : trigger.type === 'pipeline_stage' ? (
              <div className="p-4 rounded-xl bg-[var(--vl-bg-inner,rgba(255,255,255,0.04))] border border-[var(--vl-border-subtle,rgba(255,255,255,0.06))]">
                <p className="text-xs font-medium text-[var(--vl-text-white,#e2e8f0)] mb-3">
                  {lang === 'zh' ? '选择流水线状态' : 'Select pipeline status'}
                </p>
                <div className="flex gap-2 flex-wrap">
                  {['completed', 'failed'].map(status => (
                    <button
                      key={status}
                      className={`nc-priority-option ${(trigger.condition || 'completed') === status ? 'nc-active' : ''}`}
                      onClick={() => setTrigger(prev => ({ ...prev, condition: status }))}
                    >
                      {status === 'completed' ? (lang === 'zh' ? '完成' : 'Completed') : (lang === 'zh' ? '失败' : 'Failed')}
                    </button>
                  ))}
                </div>
              </div>
            ) : trigger.type === 'custom' ? (
              <div className="p-4 rounded-xl bg-[var(--vl-bg-inner,rgba(255,255,255,0.04))] border border-[var(--vl-border-subtle,rgba(255,255,255,0.06))]">
                <p className="text-xs font-medium text-[var(--vl-text-white,#e2e8f0)] mb-3">
                  {lang === 'zh' ? '自定义事件描述' : 'Custom event description'}
                </p>
                <input
                  className="are-condition-input"
                  placeholder={lang === 'zh' ? '例如: weekly-monday' : 'e.g., weekly-monday'}
                  value={conditionValue}
                  onChange={(e) => setConditionValue(e.target.value)}
                />
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[var(--vl-bg-inner,rgba(255,255,255,0.04))] border border-[var(--vl-border-subtle,rgba(255,255,255,0.06))] text-center">
                <CheckCircle2 className="size-5 text-emerald-400 mx-auto mb-2" />
                <p className="text-xs text-[var(--vl-text-body,#cbd5e1)]">
                  {lang === 'zh' ? '此触发器不需要额外条件' : 'No additional condition needed for this trigger'}
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Step 3: Action */}
        {step === 'action' && (
          <motion.div key="action-step" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div className="are-select-grid">
              {ACTION_OPTIONS.map(opt => {
                const Icon = opt.icon
                return (
                  <button
                    key={opt.type}
                    className={`are-select-option ${action.type === opt.type ? 'are-selected' : ''}`}
                    onClick={() => setAction(prev => ({ ...prev, type: opt.type }))}
                  >
                    <div className="are-select-icon" style={{ background: `${opt.color}20` }}>
                      <Icon className="size-4" style={{ color: opt.color }} />
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-xs font-medium text-[var(--vl-text-white,#e2e8f0)]">
                        {lang === 'zh' ? opt.labelZh : opt.label}
                      </p>
                      <p className="text-[10px] text-[var(--vl-text-muted,#64748b)]">
                        {lang === 'zh' ? opt.descZh : opt.desc}
                      </p>
                    </div>
                    {action.type === opt.type && <Check className="size-4 text-emerald-400 shrink-0 ml-auto" />}
                  </button>
                )
              })}
            </div>

            {/* Priority selector for notifications */}
            {action.type === 'notification' && (
              <div className="p-4 rounded-xl bg-[var(--vl-bg-inner,rgba(255,255,255,0.04))] border border-[var(--vl-border-subtle,rgba(255,255,255,0.06))]">
                <p className="text-xs font-medium text-[var(--vl-text-white,#e2e8f0)] mb-3">
                  {lang === 'zh' ? '通知优先级' : 'Notification Priority'}
                </p>
                <div className="nc-priority-filter">
                  {PRIORITY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      className={`nc-priority-option ${(action.priority || 'medium') === opt.value ? 'nc-active' : ''}`}
                      onClick={() => setAction(prev => ({ ...prev, priority: opt.value }))}
                    >
                      {lang === 'zh' ? opt.labelZh : opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Webhook URL input */}
            {action.type === 'webhook' && (
              <div className="p-4 rounded-xl bg-[var(--vl-bg-inner,rgba(255,255,255,0.04))] border border-[var(--vl-border-subtle,rgba(255,255,255,0.06))]">
                <p className="text-xs font-medium text-[var(--vl-text-white,#e2e8f0)] mb-3">
                  {lang === 'zh' ? 'Webhook URL' : 'Webhook URL'}
                </p>
                <input
                  className="are-condition-input"
                  placeholder="https://your-endpoint.com/webhook"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                />
              </div>
            )}
          </motion.div>
        )}

        {/* Step 4: Confirm */}
        {step === 'confirm' && (
          <motion.div key="confirm-step" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-semibold text-[var(--vl-text-muted,#64748b)] uppercase tracking-wider mb-1.5 block">
                  {lang === 'zh' ? '规则名称' : 'Rule Name'} *
                </label>
                <input
                  className="are-condition-input"
                  placeholder={lang === 'zh' ? '输入规则名称...' : 'Enter rule name...'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[var(--vl-text-muted,#64748b)] uppercase tracking-wider mb-1.5 block">
                  {lang === 'zh' ? '描述' : 'Description'}
                </label>
                <input
                  className="are-condition-input"
                  placeholder={lang === 'zh' ? '可选描述...' : 'Optional description...'}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            {/* Rule Summary */}
            <div className="are-flow-container">
              <div className="are-flow-block are-flow-if">
                <div className="are-flow-label">{lang === 'zh' ? '如果' : 'IF'}</div>
                <div className="are-flow-content text-[11px]">
                  {getTriggerLabel(trigger, lang)}
                </div>
              </div>
              <div className="are-flow-connector">
                <div className="are-flow-arrow"><ArrowRight className="size-3" /></div>
              </div>
              <div className="are-flow-block are-flow-then">
                <div className="are-flow-label">{lang === 'zh' ? '那么' : 'THEN'}</div>
                <div className="are-flow-content text-[11px]">
                  {getActionLabel(action, lang)}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-[var(--vl-border,rgba(255,255,255,0.08))]">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 text-xs text-[var(--vl-text-muted,#64748b)]" onClick={onCancel}>
            <X className="size-3 mr-1" />
            {lang === 'zh' ? '取消' : 'Cancel'}
          </Button>
          {stepIndex > 0 && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={handleBack}>
              <ChevronLeft className="size-3 mr-1" />
              {lang === 'zh' ? '上一步' : 'Back'}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {step !== 'confirm' ? (
            <Button size="sm" className="h-8 text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25" onClick={handleNext} disabled={!canNext}>
              {lang === 'zh' ? '下一步' : 'Next'}
              <ChevronRight className="size-3 ml-1" />
            </Button>
          ) : (
            <Button size="sm" className="h-8 text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25" onClick={handleFinish} disabled={!canNext}>
              <Check className="size-3 mr-1" />
              {lang === 'zh' ? '创建规则' : 'Create Rule'}
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ── Built-in Template Selector ──

function TemplateSelector({
  lang,
  onSelect,
}: {
  lang: Lang
  onSelect: (template: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>) => void
}) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold text-[var(--vl-text-muted,#64748b)] uppercase tracking-wider">
        {lang === 'zh' ? '快速开始：选择内置模板' : 'Quick Start: Choose a built-in template'}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {BUILT_IN_TEMPLATES.map((tmpl, i) => {
          const triggerOpt = TRIGGER_OPTIONS.find(o => o.type === tmpl.trigger.type)
          const TIcon = triggerOpt?.icon || Zap
          return (
            <button
              key={i}
              className="are-template-card text-left"
              onClick={() => onSelect(tmpl)}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="are-select-icon" style={{ background: `${triggerOpt?.color || '#10b981'}20` }}>
                  <TIcon className="size-3.5" style={{ color: triggerOpt?.color || '#10b981' }} />
                </div>
                <span className="text-xs font-semibold text-[var(--vl-text-white,#e2e8f0)] truncate">
                  {tmpl.name}
                </span>
              </div>
              <p className="text-[10px] text-[var(--vl-text-muted,#64748b)] line-clamp-2">{tmpl.description}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================
// Main Component: AlertRulesEngine
// ============================================================

export function AlertRulesEngine({ lang = 'en' }: AlertRulesEngineProps) {
  const [rules, setRules] = useRulesState()
  const [creating, setCreating] = useState(false)
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null)
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({})
  const [view, setView] = useState<'rules' | 'create' | 'templates'>('rules')

  const activeRules = useMemo(() => rules.filter(r => r.enabled), [rules])
  const disabledRules = useMemo(() => rules.filter(r => !r.enabled), [rules])

  const handleCreate = useCallback((ruleData: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newRule: AlertRule = {
      ...ruleData,
      id: `rule-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setRules(prev => [newRule, ...prev])
    setCreating(false)
    setEditingRule(null)
    setView('rules')
    toast.success(lang === 'zh' ? '规则创建成功' : 'Rule created successfully')
  }, [setRules, lang])

  const handleUpdate = useCallback((ruleData: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!editingRule) return
    setRules(prev => prev.map(r => r.id === editingRule.id ? { ...r, ...ruleData, updatedAt: new Date().toISOString() } : r))
    setEditingRule(null)
    setView('rules')
    toast.success(lang === 'zh' ? '规则更新成功' : 'Rule updated successfully')
  }, [editingRule, setRules, lang])

  const handleToggle = useCallback((ruleId: string) => {
    setRules(prev => prev.map(r => r.id === ruleId ? { ...r, enabled: !r.enabled, updatedAt: new Date().toISOString() } : r))
  }, [setRules])

  const handleDelete = useCallback((ruleId: string) => {
    setRules(prev => prev.filter(r => r.id !== ruleId))
    setTestResults(prev => {
      const { [ruleId]: _, ...rest } = prev
      return rest
    })
    toast.success(lang === 'zh' ? '规则已删除' : 'Rule deleted')
  }, [setRules, lang])

  const handleTest = useCallback(async (rule: AlertRule) => {
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'trigger',
          ruleId: rule.id,
          testData: {
            type: rule.trigger.type,
            data: {
              duration: rule.trigger.type === 'meeting_duration' ? (rule.trigger.value as number || 35) : undefined,
              messageCount: rule.trigger.type === 'agent_messages' ? (rule.trigger.value as number || 12) : undefined,
            },
          },
        }),
      })
      const data = await res.json()
      if (data.evaluation) {
        setTestResults(prev => ({
          ...prev,
          [rule.id]: {
            success: true,
            triggered: data.evaluation.matched,
            reason: data.evaluation.reason,
            timestamp: data.evaluation.timestamp,
          },
        }))
        toast.info(data.evaluation.matched ? (lang === 'zh' ? '测试通过：规则会触发' : 'Test passed: Rule would trigger') : (lang === 'zh' ? '测试未通过：规则不会触发' : 'Test passed: Rule would not trigger'))
      }
    } catch {
      // Simulate test locally if API fails
      const sampleDuration = 35
      let triggered = false
      if (rule.trigger.type === 'meeting_completed') triggered = true
      if (rule.trigger.type === 'meeting_duration') {
        const threshold = typeof rule.trigger.value === 'number' ? rule.trigger.value : 30
        triggered = sampleDuration > threshold
      }
      if (rule.trigger.type === 'agent_messages') {
        const threshold = typeof rule.trigger.value === 'number' ? rule.trigger.value : 10
        triggered = 12 > threshold
      }
      if (rule.trigger.type === 'custom') triggered = true
      if (rule.trigger.type === 'meeting_created') triggered = true
      if (rule.trigger.type === 'pipeline_stage') triggered = rule.trigger.condition === 'completed' || rule.trigger.condition === 'failed'

      setTestResults(prev => ({
        ...prev,
        [rule.id]: {
          success: true,
          triggered,
          reason: triggered
            ? (lang === 'zh' ? '条件匹配 — 动作将被触发' : 'Condition matched — action would be triggered')
            : (lang === 'zh' ? '条件未匹配 — 无动作触发' : 'Condition did not match — no action triggered'),
          timestamp: new Date().toISOString(),
        },
      }))
      toast.info(triggered ? (lang === 'zh' ? '测试通过：规则会触发' : 'Test passed: Rule would trigger') : (lang === 'zh' ? '测试未通过' : 'Test failed'))
    }
  }, [lang])

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="nc-center">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--vl-border,rgba(255,255,255,0.08))]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-500/15">
              <Zap className="size-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--vl-text-white,#e2e8f0)]">
                {lang === 'zh' ? '告警规则引擎' : 'Alert Rules Engine'}
              </h2>
              <p className="text-[10px] text-[var(--vl-text-muted,#64748b)]">
                {lang === 'zh' ? `${rules.length} 条规则 · ${activeRules.length} 条活跃` : `${rules.length} rules · ${activeRules.length} active`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25"
              onClick={() => { setEditingRule(null); setView('create'); }}
            >
              <Plus className="size-3" />
              {lang === 'zh' ? '创建规则' : 'Create Rule'}
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="nc-filter-tabs">
          {[
            { key: 'rules' as const, label: lang === 'zh' ? '我的规则' : 'My Rules' },
            { key: 'templates' as const, label: lang === 'zh' ? '模板' : 'Templates' },
          ].map(tab => (
            <button
              key={tab.key}
              className={`nc-filter-tab ${view === tab.key ? 'nc-active' : ''}`}
              onClick={() => setView(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <ScrollArea className="nc-scroll-list" style={{ maxHeight: '60vh' }}>
          <AnimatePresence mode="wait">
            {view === 'create' && (
              <motion.div key="create-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <RuleWizard
                  lang={lang}
                  onComplete={editingRule ? handleUpdate : handleCreate}
                  onCancel={() => { setView('rules'); setEditingRule(null) }}
                  editRule={editingRule}
                />
              </motion.div>
            )}

            {view === 'rules' && (
              <motion.div key="rules-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 space-y-4">
                {/* Active Rules */}
                {activeRules.length > 0 && (
                  <div>
                    <div className="are-section-title">
                      <Zap className="size-3 text-emerald-400" />
                      {lang === 'zh' ? `活跃规则 (${activeRules.length})` : `Active Rules (${activeRules.length})`}
                    </div>
                    <div className="space-y-3">
                      <AnimatePresence>
                        {activeRules.map(rule => (
                          <RuleCard
                            key={rule.id}
                            rule={rule}
                            onToggle={() => handleToggle(rule.id)}
                            onEdit={() => { setEditingRule(rule); setView('create') }}
                            onDelete={() => handleDelete(rule.id)}
                            onTest={() => handleTest(rule)}
                            testResult={testResults[rule.id]}
                            lang={lang}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                )}

                {/* Disabled Rules */}
                {disabledRules.length > 0 && (
                  <div>
                    <div className="are-section-title">
                      <BellOff className="size-3 text-[var(--vl-text-muted,#64748b)]" />
                      {lang === 'zh' ? `已禁用 (${disabledRules.length})` : `Disabled (${disabledRules.length})`}
                    </div>
                    <div className="space-y-3 opacity-60">
                      <AnimatePresence>
                        {disabledRules.map(rule => (
                          <RuleCard
                            key={rule.id}
                            rule={rule}
                            onToggle={() => handleToggle(rule.id)}
                            onEdit={() => { setEditingRule(rule); setView('create') }}
                            onDelete={() => handleDelete(rule.id)}
                            onTest={() => handleTest(rule)}
                            testResult={testResults[rule.id]}
                            lang={lang}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                )}

                {rules.length === 0 && (
                  <div className="nc-empty-state">
                    <div className="nc-empty-icon">
                      <Zap className="size-7 text-amber-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-[var(--vl-text-white,#e2e8f0)] mb-1">
                      {lang === 'zh' ? '没有规则' : 'No rules yet'}
                    </h3>
                    <p className="text-xs text-[var(--vl-text-muted,#64748b)] max-w-[220px]">
                      {lang === 'zh'
                        ? '创建告警规则以自动响应研究活动事件'
                        : 'Create alert rules to automatically respond to research activity events'}
                    </p>
                    <Button
                      size="sm"
                      className="mt-4 h-8 text-xs gap-1.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25"
                      onClick={() => setView('create')}
                    >
                      <Plus className="size-3" />
                      {lang === 'zh' ? '创建第一条规则' : 'Create First Rule'}
                    </Button>
                  </div>
                )}
              </motion.div>
            )}

            {view === 'templates' && (
              <motion.div key="templates-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4">
                <TemplateSelector
                  lang={lang}
                  onSelect={(tmpl) => {
                    handleCreate(tmpl)
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </ScrollArea>
      </div>
    </div>
  )
}
