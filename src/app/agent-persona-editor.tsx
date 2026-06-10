'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { toast } from 'sonner'
import {
  X, Save, RotateCcw, SlidersHorizontal, MessageSquare, ThermometerSun,
  GraduationCap, ClipboardCheck, Users, HelpCircle, BookOpen,
  Sparkles, Loader2, Eye, ChevronRight, ChevronDown, ChevronUp,
  Copy, Check, Bot, Brain, FlaskConical, Microscope, Atom, Dna,
  Cpu, Lightbulb, Stethoscope, Heart, Zap, Globe2, BookOpen as BookOpenIcon,
  Music, Palette, Rocket, Shield, Target, Code2, Plus, Tag,
  Hexagon, Diamond, Square, Circle, Minus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import { AgentAvatar, renderAgentIcon } from './shared-components'
import type { Agent } from './shared-types'

// ============================================================
// Types
// ============================================================

export interface AgentPersonaEditorProps {
  agent: Agent
  lang: Lang
  onClose: () => void
}

type AvatarShape = 'circle' | 'square' | 'hexagon' | 'diamond'
type AvatarGradient = string
type AvatarIconName = string

interface AvatarConfig {
  shape: AvatarShape
  gradient: AvatarGradient
  icon: AvatarIconName
}

interface PersonalityTrait {
  id: string
  nameKey: string
  descKey: string
  category: 'communication' | 'analysis' | 'collaboration' | 'expertise'
}

interface PersonaConfig {
  tone: string
  responseStyle: string
  customInstructions: string
  temperatureOverride: number | null
  avatar: AvatarConfig
  traits: string[]
  responseLength: number // 0=Short, 1=Medium, 2=Long, 3=Verbose
  responseFormats: string[]
  tonePreset: string
  knowledgeTags: string[]
}

interface PersonaPreset {
  id: string
  label: string
  icon: React.ElementType
  description: string
  color: string
  config: Omit<PersonaConfig, 'customInstructions' | 'temperatureOverride' | 'avatar' | 'traits' | 'responseLength' | 'responseFormats' | 'tonePreset' | 'knowledgeTags'> & {
    customInstructions: string
  }
}

// ============================================================
// Constants
// ============================================================

const AVATAR_SHAPES: { id: AvatarShape; icon: React.ElementType; labelKey: string }[] = [
  { id: 'circle', icon: Circle, labelKey: 'persona.circle' },
  { id: 'square', icon: Square, labelKey: 'persona.roundedSquare' },
  { id: 'hexagon', icon: Hexagon, labelKey: 'persona.hexagon' },
  { id: 'diamond', icon: Diamond, labelKey: 'persona.diamond' },
]

const AVATAR_GRADIENTS: { id: string; cssClass: string; colors: [string, string] }[] = [
  { id: 'emerald-teal', cssClass: 'avatar-gradient-emerald-teal', colors: ['#10b981', '#14b8a6'] },
  { id: 'blue-indigo', cssClass: 'avatar-gradient-blue-indigo', colors: ['#3b82f6', '#6366f1'] },
  { id: 'violet-pink', cssClass: 'avatar-gradient-violet-pink', colors: ['#8b5cf6', '#ec4899'] },
  { id: 'rose-orange', cssClass: 'avatar-gradient-rose-orange', colors: ['#f43f5e', '#f97316'] },
  { id: 'amber-yellow', cssClass: 'avatar-gradient-amber-yellow', colors: ['#f59e0b', '#eab308'] },
  { id: 'cyan-blue', cssClass: 'avatar-gradient-cyan-blue', colors: ['#06b6d4', '#3b82f6'] },
  { id: 'green-cyan', cssClass: 'avatar-gradient-green-cyan', colors: ['#22c55e', '#06b6d4'] },
  { id: 'pink-rose', cssClass: 'avatar-gradient-pink-rose', colors: ['#ec4899', '#f43f5e'] },
  { id: 'orange-red', cssClass: 'avatar-gradient-orange-red', colors: ['#f97316', '#ef4444'] },
  { id: 'teal-emerald', cssClass: 'avatar-gradient-teal-emerald', colors: ['#14b8a6', '#10b981'] },
  { id: 'indigo-violet', cssClass: 'avatar-gradient-indigo-violet', colors: ['#6366f1', '#8b5cf6'] },
  { id: 'yellow-amber', cssClass: 'avatar-gradient-yellow-amber', colors: ['#eab308', '#f59e0b'] },
]

const AVATAR_ICONS: { id: string; icon: React.ElementType }[] = [
  { id: 'bot', icon: Bot },
  { id: 'brain', icon: Brain },
  { id: 'flask', icon: FlaskConical },
  { id: 'microscope', icon: Microscope },
  { id: 'atom', icon: Atom },
  { id: 'dna', icon: Dna },
  { id: 'cpu', icon: Cpu },
  { id: 'lightbulb', icon: Lightbulb },
  { id: 'graduation', icon: GraduationCap },
  { id: 'stethoscope', icon: Stethoscope },
  { id: 'heart', icon: Heart },
  { id: 'zap', icon: Zap },
  { id: 'globe', icon: Globe2 },
  { id: 'book', icon: BookOpenIcon },
  { id: 'music', icon: Music },
  { id: 'palette', icon: Palette },
  { id: 'rocket', icon: Rocket },
  { id: 'shield', icon: Shield },
  { id: 'target', icon: Target },
  { id: 'code', icon: Code2 },
]

const PERSONALITY_TRAITS: PersonalityTrait[] = [
  { id: 'concise', nameKey: 'persona.traitConcise', descKey: 'persona.traitConciseDesc', category: 'communication' },
  { id: 'detailed', nameKey: 'persona.traitDetailed', descKey: 'persona.traitDetailedDesc', category: 'communication' },
  { id: 'friendly', nameKey: 'persona.traitFriendly', descKey: 'persona.traitFriendlyDesc', category: 'communication' },
  { id: 'formal', nameKey: 'persona.traitFormal', descKey: 'persona.traitFormalDesc', category: 'communication' },
  { id: 'creative', nameKey: 'persona.traitCreative', descKey: 'persona.traitCreativeDesc', category: 'analysis' },
  { id: 'analytical', nameKey: 'persona.traitAnalytical', descKey: 'persona.traitAnalyticalDesc', category: 'analysis' },
  { id: 'skeptical', nameKey: 'persona.traitSkeptical', descKey: 'persona.traitSkepticalDesc', category: 'analysis' },
  { id: 'openMinded', nameKey: 'persona.traitOpenMinded', descKey: 'persona.traitOpenMindedDesc', category: 'analysis' },
  { id: 'leader', nameKey: 'persona.traitLeader', descKey: 'persona.traitLeaderDesc', category: 'collaboration' },
  { id: 'supportive', nameKey: 'persona.traitSupportive', descKey: 'persona.traitSupportiveDesc', category: 'collaboration' },
  { id: 'independent', nameKey: 'persona.traitIndependent', descKey: 'persona.traitIndependentDesc', category: 'collaboration' },
  { id: 'diplomatic', nameKey: 'persona.traitDiplomatic', descKey: 'persona.traitDiplomaticDesc', category: 'collaboration' },
  { id: 'novice', nameKey: 'persona.traitNovice', descKey: 'persona.traitNoviceDesc', category: 'expertise' },
  { id: 'intermediate', nameKey: 'persona.traitIntermediate', descKey: 'persona.traitIntermediateDesc', category: 'expertise' },
  { id: 'expert', nameKey: 'persona.traitExpert', descKey: 'persona.traitExpertDesc', category: 'expertise' },
  { id: 'authority', nameKey: 'persona.traitAuthority', descKey: 'persona.traitAuthorityDesc', category: 'expertise' },
]

const TRAIT_CATEGORIES = [
  { id: 'communication' as const, labelKey: 'persona.communication' },
  { id: 'analysis' as const, labelKey: 'persona.analysis' },
  { id: 'collaboration' as const, labelKey: 'persona.collaboration' },
  { id: 'expertise' as const, labelKey: 'persona.expertise' },
]

const RESPONSE_LENGTH_LABELS = ['Short', 'Medium', 'Long', 'Verbose']

const RESPONSE_FORMATS = [
  { id: 'paragraph', labelKey: 'persona.formatParagraph' },
  { id: 'bulletPoints', labelKey: 'persona.formatBulletPoints' },
  { id: 'numberedList', labelKey: 'persona.formatNumberedList' },
  { id: 'codeBlocks', labelKey: 'persona.formatCodeBlocks' },
  { id: 'tables', labelKey: 'persona.formatTables' },
]

const TONE_PRESETS = [
  { id: 'academic', labelKey: 'persona.academic' },
  { id: 'conversational', labelKey: 'persona.conversational' },
  { id: 'technical', labelKey: 'persona.technical' },
  { id: 'creative', labelKey: 'persona.creativeTone' },
  { id: 'minimalist', labelKey: 'persona.minimalist' },
]

const KNOWLEDGE_SUGGESTIONS: Record<string, string[]> = {
  biology: ['molecular-biology', 'protein-structure', 'genomics', 'cell-biology', 'immunology', 'bioinformatics', 'evolution', 'ecology'],
  'computer science': ['machine-learning', 'algorithms', 'databases', 'networks', 'security', 'distributed-systems', 'operating-systems', 'compilers'],
  chemistry: ['organic-chemistry', 'spectroscopy', 'crystallography', 'thermodynamics', 'catalysis', 'polymer-chemistry', 'analytical-chemistry', 'quantum-chemistry'],
  physics: ['quantum-mechanics', 'thermodynamics', 'optics', 'astrophysics', 'particle-physics', 'condensed-matter', 'electromagnetism', 'fluid-dynamics'],
}

const PERSONA_PRESETS: PersonaPreset[] = [
  {
    id: 'mentor',
    label: 'Mentor',
    icon: GraduationCap,
    description: 'Encouraging & thorough',
    color: '#10b981',
    config: {
      tone: 'warm',
      responseStyle: 'detailed',
      customInstructions: 'Be encouraging and provide thorough explanations with examples',
    },
  },
  {
    id: 'reviewer',
    label: 'Reviewer',
    icon: ClipboardCheck,
    description: 'Critical & concise',
    color: '#f59e0b',
    config: {
      tone: 'critical',
      responseStyle: 'concise',
      customInstructions: 'Focus on identifying weaknesses and suggesting improvements',
    },
  },
  {
    id: 'collaborator',
    label: 'Collaborator',
    icon: Users,
    description: 'Casual & balanced',
    color: '#06b6d4',
    config: {
      tone: 'casual',
      responseStyle: 'balanced',
      customInstructions: 'Engage as an equal partner, build on ideas together',
    },
  },
  {
    id: 'skeptic',
    label: 'Skeptic',
    icon: HelpCircle,
    description: 'Analytical & brief',
    color: '#ef4444',
    config: {
      tone: 'analytical',
      responseStyle: 'brief',
      customInstructions: 'Challenge assumptions, ask probing questions',
    },
  },
  {
    id: 'educator',
    label: 'Educator',
    icon: BookOpen,
    description: 'Academic & detailed',
    color: '#8b5cf6',
    config: {
      tone: 'academic',
      responseStyle: 'detailed',
      customInstructions: 'Provide comprehensive explanations with references to literature',
    },
  },
]

const TONE_LABELS: Record<number, { label: string; description: string }> = {
  1: { label: 'Formal/Professional', description: 'Strict professional language' },
  2: { label: 'Academic', description: 'Scholarly tone' },
  3: { label: 'Neutral', description: 'Balanced communication' },
  4: { label: 'Casual', description: 'Relaxed & friendly' },
  5: { label: 'Enthusiastic', description: 'Highly energetic' },
}

const TONE_GRADIENT_STOPS = [
  { pos: 0, color: '#3b82f6' },
  { pos: 25, color: '#10b981' },
  { pos: 50, color: '#84cc16' },
  { pos: 75, color: '#f59e0b' },
  { pos: 100, color: '#f97316' },
]

const RESPONSE_STYLES = [
  { value: 'brief', label: 'Brief', description: 'Short, concise responses (1-2 sentences)', icon: MessageSquare },
  { value: 'balanced', label: 'Balanced', description: 'Medium-length responses (3-5 sentences)', icon: SlidersHorizontal },
  { value: 'detailed', label: 'Detailed', description: 'Comprehensive responses with examples', icon: BookOpen },
]

const MAX_CUSTOM_INSTRUCTIONS = 500
const MAX_TRAITS = 4
const MAX_TAGS = 10

const DEFAULT_PERSONA: PersonaConfig = {
  tone: 'professional',
  responseStyle: 'balanced',
  customInstructions: '',
  temperatureOverride: null,
  avatar: {
    shape: 'circle',
    gradient: 'emerald-teal',
    icon: 'bot',
  },
  traits: [],
  responseLength: 1,
  responseFormats: ['paragraph'],
  tonePreset: 'academic',
  knowledgeTags: [],
}

// ============================================================
// Helper: Generate preview message
// ============================================================

function generatePreviewMessage(agent: Agent, persona: PersonaConfig): string {
  const toneMap: Record<string, string> = {
    warm: "I'd be happy to help you with that! Let me walk you through this step by step.",
    critical: "There are several issues worth addressing here. First, let me highlight the main concerns.",
    casual: "Hey, here's what I think about that — let's break it down together.",
    analytical: "Let me examine the underlying assumptions. There are a few points that warrant scrutiny.",
    academic: "According to current literature, this approach demonstrates significant potential in the field of " + agent.expertise.split(' ').slice(0, 4).join(' ') + ".",
    professional: "Based on the available evidence, here is my assessment of the situation.",
    formal: "The following analysis has been prepared with consideration of the relevant parameters.",
    enthusiastic: "This is a fantastic direction! The possibilities here are truly exciting — let me share my thoughts!",
  }

  const styleMap: Record<string, (base: string) => string> = {
    brief: (base) => base,
    balanced: (base) => base + " I've considered multiple perspectives and believe this approach offers the best balance of rigor and practicality.",
    detailed: (base) => base + " For instance, in a recent systematic review, similar methodologies yielded promising results across diverse experimental conditions. This aligns with the current consensus in " + agent.expertise.split(',').slice(0, 1).join('') + ", though there are notable caveats to consider. I'd recommend cross-referencing with established protocols.",
  }

  const baseMessage = toneMap[persona.tone] || toneMap['professional']
  const styler = styleMap[persona.responseStyle] || styleMap['balanced']
  return styler(baseMessage)
}

// ============================================================
// Helper: Tone name to numeric value
// ============================================================

function toneToValue(tone: string): number {
  const map: Record<string, number> = {
    formal: 1, professional: 1, academic: 2, analytical: 2,
    neutral: 3, casual: 4, warm: 4, enthusiastic: 5, critical: 3,
  }
  return map[tone] || 3
}

// ============================================================
// Helper: Avatar SVG renderer
// ============================================================

function AvatarSvgPreview({
  shape,
  gradientId,
  iconId,
  size = 64,
}: {
  shape: AvatarShape
  gradientId: string
  iconId: string
  size?: number
}) {
  const gradient = AVATAR_GRADIENTS.find(g => g.id === gradientId) || AVATAR_GRADIENTS[0]
  const iconObj = AVATAR_ICONS.find(i => i.id === iconId) || AVATAR_ICONS[0]
  const IconComp = iconObj.icon

  const clipPaths: Record<AvatarShape, string> = {
    circle: 'circle(32)',
    square: 'inset(0 0 0 0 round(16%)',
    hexagon: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
    diamond: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
  }

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`av-grad-${gradientId}`} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={gradient.colors[0]} />
          <stop offset="100%" stopColor={gradient.colors[1]} />
        </linearGradient>
        <clipPath id={`av-clip-${shape}`}>
          <path d={clipPaths[shape] === 'circle'
            ? ''
            : clipPaths[shape] === 'square'
              ? 'M 10 10 L 54 10 Q 60 10 60 16 L 60 48 Q 60 54 54 54 L 10 54 Q 4 54 4 48 L 4 16 Q 4 10 10 10 Z'
              : ''
          } />
        </clipPath>
      </defs>
      <g clipPath={shape === 'circle' ? `url(#circle-clip)` : `url(#av-clip-${shape})`}>
        <rect width="64" height="64" fill={`url(#av-grad-${gradientId})`} clipPath={shape === 'circle' ? 'circle(32)' : clipPaths[shape]} />
        <foreignObject x="12" y="12" width="40" height="40">
          <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconComp size={24} color="white" strokeWidth={1.5} />
          </div>
        </foreignObject>
      </g>
    </svg>
  )
}

// ============================================================
// Helper: Generate system prompt from persona config
// ============================================================

function generateSystemPrompt(agent: Agent, persona: PersonaConfig): string {
  const parts: string[] = []

  // Role & expertise
  parts.push(`You are ${agent.title}.`)
  parts.push(`Expertise: ${agent.expertise}`)
  parts.push(`Role: ${agent.role}`)

  // Tone
  parts.push(`Tone: ${persona.tone}`)

  // Personality traits
  if (persona.traits.length > 0) {
    parts.push(`Personality traits: ${persona.traits.join(', ')}`)
  }

  // Response style
  parts.push(`Response style: ${persona.responseStyle} (${RESPONSE_LENGTH_LABELS[persona.responseLength] || 'Medium'})`)

  if (persona.responseFormats.length > 0) {
    parts.push(`Preferred formats: ${persona.responseFormats.join(', ')}`)
  }

  // Knowledge domains
  if (persona.knowledgeTags.length > 0) {
    parts.push(`Knowledge domains: ${persona.knowledgeTags.join(', ')}`)
  }

  // Custom instructions
  if (persona.customInstructions) {
    parts.push(`Additional instructions: ${persona.customInstructions}`)
  }

  return parts.join('\n')
}

// ============================================================
// Sub-components
// ============================================================

function PresetCard({
  preset,
  isSelected,
  onClick,
}: {
  preset: PersonaPreset
  isSelected: boolean
  onClick: () => void
}) {
  const IconComp = preset.icon
  return (
    <motion.button
      layout
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`
        relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer
        transition-all duration-200 magnetic-hover card-3d
        ${isSelected
          ? 'border-[var(--vl-border-accent)] bg-[var(--vl-accent-bg)] shadow-[0_0_20px_rgba(16,185,129,0.12)]'
          : 'border-[var(--vl-border-subtle)] bg-[var(--vl-bg-inner)] hover:border-[var(--vl-border)] hover:bg-[var(--vl-bg-card-hover)]'
        }
      `}
      aria-label={`Select ${preset.label} persona preset`}
      aria-pressed={isSelected}
    >
      {isSelected && (
        <motion.div
          layoutId="preset-indicator"
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
        >
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>
      )}
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200"
        style={{
          backgroundColor: isSelected ? preset.color + '25' : preset.color + '12',
          boxShadow: isSelected ? `0 0 12px ${preset.color}30` : 'none',
        }}
      >
        <IconComp className="size-5" style={{ color: preset.color }} />
      </div>
      <div className="text-center">
        <p className="text-xs font-semibold" style={{ color: 'var(--vl-text-white)' }}>{preset.label}</p>
        <p className="text-[10px] vl-text-muted">{preset.description}</p>
      </div>
    </motion.button>
  )
}

function ToneSlider({
  value,
  onChange,
}: {
  value: number
  onChange: (value: number) => void
}) {
  const percentage = ((value - 1) / 4) * 100
  const gradientColors = TONE_GRADIENT_STOPS.map(s => `${s.color} ${s.pos}%`).join(', ')

  return (
    <div className="space-y-3">
      <div className="flex justify-between">
        {Object.entries(TONE_LABELS).map(([num, { label }]) => (
          <span
            key={num}
            className={`text-[10px] transition-colors duration-200 ${
              parseInt(num) === value
                ? 'font-semibold text-emerald-400'
                : 'vl-text-muted'
            }`}
          >
            {label.split('/')[0]}
          </span>
        ))}
      </div>
      <div className="relative px-1">
        <div
          className="absolute top-1/2 -translate-y-1/2 left-1 right-1 h-1.5 rounded-full pointer-events-none z-0"
          style={{ background: `linear-gradient(90deg, ${gradientColors})`, opacity: 0.3 }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 left-1 h-1.5 rounded-full pointer-events-none z-0"
          style={{
            width: `calc(${percentage}% * 0.92 + 0.5rem)`,
            background: `linear-gradient(90deg, ${gradientColors})`,
            opacity: 0.8,
          }}
        />
        <Slider
          value={[value]}
          onValueChange={([v]) => onChange(v)}
          min={1}
          max={5}
          step={1}
          className="relative z-10"
        />
      </div>
      <motion.div
        layout
        className="flex items-center justify-center gap-2"
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        <div
          className="w-2 h-2 rounded-full"
          style={{
            backgroundColor: TONE_GRADIENT_STOPS.find(s => Math.abs(s.pos - percentage) < 20)?.color || '#10b981',
          }}
        />
        <span className="text-xs font-medium vl-text-body">
          {TONE_LABELS[value]?.description}
        </span>
      </motion.div>
    </div>
  )
}

function ResponseStyleCard({
  option,
  isSelected,
  onClick,
}: {
  option: typeof RESPONSE_STYLES[number]
  isSelected: boolean
  onClick: () => void
}) {
  const IconComp = option.icon
  return (
    <motion.button
      layout
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer
        transition-all duration-200 w-full text-left
        ${isSelected
          ? 'border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_12px_rgba(16,185,129,0.08)]'
          : 'border-[var(--vl-border-subtle)] bg-[var(--vl-bg-inner)] hover:border-[var(--vl-border)] hover:bg-[var(--vl-bg-card-hover)]'
        }
      `}
      aria-label={`Set response style to ${option.label}`}
      aria-pressed={isSelected}
    >
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-200 ${
          isSelected ? 'bg-emerald-500/20' : 'bg-[var(--vl-bg-secondary)]'
        }`}
      >
        <IconComp className={`size-4 ${isSelected ? 'text-emerald-400' : 'vl-text-muted'}`} />
      </div>
      <div className="min-w-0">
        <p className={`text-sm font-medium ${isSelected ? 'text-emerald-400' : 'vl-text-heading'}`}>{option.label}</p>
        <p className="text-[10px] vl-text-muted">{option.description}</p>
      </div>
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="ml-auto shrink-0 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center"
        >
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>
      )}
    </motion.button>
  )
}

// ============================================================
// Persona Preview Panel
// ============================================================

function PersonaPreviewPanel({
  agent,
  persona,
  lang,
}: {
  agent: Agent
  persona: PersonaConfig
  lang: Lang
}) {
  const [promptExpanded, setPromptExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const prompt = useMemo(() => generateSystemPrompt(agent, persona), [agent, persona])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [prompt])

  const previewMessage = useMemo(
    () => generatePreviewMessage(agent, persona),
    [agent, persona]
  )

  return (
    <div className="space-y-4">
      {/* Agent Card Preview */}
      <div className="persona-preview-card">
        <p className="text-[10px] font-semibold uppercase tracking-wide vl-text-muted mb-3 flex items-center gap-2">
          <Eye className="size-3" />
          {t(lang, 'persona.previewCard')}
        </p>
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 shrink-0">
            <AvatarSvgPreview
              shape={persona.avatar.shape}
              gradientId={persona.avatar.gradient}
              iconId={persona.avatar.icon}
              size={48}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold" style={{ color: agent.color }}>{agent.title}</p>
            <p className="text-[11px] vl-text-muted line-clamp-1">{agent.role}</p>
            <p className="text-[10px] vl-text-muted line-clamp-1 mt-0.5">{agent.expertise}</p>
          </div>
        </div>

        {/* Traits pills */}
        {persona.traits.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {persona.traits.map(traitId => {
              const trait = PERSONALITY_TRAITS.find(t => t.id === traitId)
              if (!trait) return null
              return (
                <Badge key={traitId} variant="outline" className="text-[9px] px-2 py-0" style={{ borderColor: 'rgba(16,185,129,0.3)', color: '#10b981' }}>
                  {t(lang, trait.nameKey)}
                </Badge>
              )
            })}
          </div>
        )}

        {/* Knowledge tags */}
        {persona.knowledgeTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {persona.knowledgeTags.map(tag => (
              <Badge key={tag} variant="outline" className="text-[9px] px-2 py-0" style={{ borderColor: 'var(--vl-border-subtle)' }}>
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Response style summary */}
        <div className="mt-3 text-[10px] vl-text-muted">
          {t(lang, 'persona.responseStyle')}: {RESPONSE_LENGTH_LABELS[persona.responseLength]} · {persona.responseFormats.length > 0 ? persona.responseFormats.join(', ') : t(lang, 'persona.formatParagraph')}
        </div>
      </div>

      {/* Chat bubble preview */}
      <div className="vl-inner rounded-xl p-3 space-y-2 border border-[var(--vl-border-subtle)]">
        <p className="text-[10px] font-semibold uppercase tracking-wide vl-text-muted flex items-center gap-2">
          <MessageSquare className="size-3" />
          {t(lang, 'persona.responsePreview')}
        </p>
        <div className="flex gap-2">
          <div className="w-7 h-7 shrink-0">
            <AvatarSvgPreview
              shape={persona.avatar.shape}
              gradientId={persona.avatar.gradient}
              iconId={persona.avatar.icon}
              size={28}
            />
          </div>
          <motion.p
            key={persona.tone + persona.responseStyle + persona.customInstructions}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-xs vl-text-body leading-relaxed"
          >
            {previewMessage}
          </motion.p>
        </div>
      </div>

      {/* Prompt preview */}
      <div className="vl-inner rounded-xl border border-[var(--vl-border-subtle)] overflow-hidden">
        <button
          onClick={() => setPromptExpanded(!promptExpanded)}
          className="w-full flex items-center justify-between p-3 hover:bg-[var(--vl-bg-card-hover)] transition-colors cursor-pointer"
          aria-expanded={promptExpanded}
        >
          <span className="text-[10px] font-semibold uppercase tracking-wide vl-text-muted flex items-center gap-2">
            <Sparkles className="size-3" />
            {t(lang, 'persona.promptPreview')}
          </span>
          <motion.div animate={{ rotate: promptExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            {promptExpanded
              ? <ChevronDown className="size-3.5 vl-text-muted" />
              : <ChevronUp className="size-3.5 vl-text-muted" />
            }
          </motion.div>
        </button>
        <AnimatePresence>
          {promptExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3">
                <div className="prompt-preview">{prompt}</div>
                <button
                  onClick={handleCopy}
                  className="mt-2 flex items-center gap-1.5 text-[10px] vl-text-muted hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                  {copied ? t(lang, 'persona.promptCopied') : t(lang, 'persona.promptCopy')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ============================================================
// Main Component
// ============================================================

export function AgentPersonaEditor({ agent, lang, onClose }: AgentPersonaEditorProps) {
  // Persona state
  const [persona, setPersona] = useState<PersonaConfig>(DEFAULT_PERSONA)
  const [originalPersona, setOriginalPersona] = useState<PersonaConfig>(DEFAULT_PERSONA)
  const [activePreset, setActivePreset] = useState<string | null>(null)
  const [temperatureEnabled, setTemperatureEnabled] = useState(false)

  // UI state
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [tagInput, setTagInput] = useState('')

  // Derived tone value (1-5)
  const toneValue = toneToValue(persona.tone)

  // Get suggested tags based on agent expertise
  const suggestedTags = useMemo(() => {
    const lowerExp = agent.expertise.toLowerCase()
    for (const [field, tags] of Object.entries(KNOWLEDGE_SUGGESTIONS)) {
      if (lowerExp.includes(field)) return tags.filter(t => !persona.knowledgeTags.includes(t))
    }
    return Object.values(KNOWLEDGE_SUGGESTIONS).flat().filter(t => !persona.knowledgeTags.includes(t)).slice(0, 16)
  }, [agent.expertise, persona.knowledgeTags])

  // Fetch existing persona on mount
  useEffect(() => {
    let cancelled = false
    async function fetchPersona() {
      try {
        const res = await fetch(`/api/agents/${agent.id}/persona`)
        if (!res.ok) throw new Error('Failed to fetch persona')
        const data = await res.json()
        if (!cancelled) {
          // Merge with defaults for new fields
          const merged: PersonaConfig = { ...DEFAULT_PERSONA, ...data }
          setPersona(merged)
          setOriginalPersona(merged)
          setTemperatureEnabled(data.temperatureOverride !== null)
        }
      } catch {
        if (!cancelled) {
          setPersona(DEFAULT_PERSONA)
          setOriginalPersona(DEFAULT_PERSONA)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    fetchPersona()
    return () => { cancelled = true }
  }, [agent.id])

  // Handler: Update persona field
  const updateField = useCallback(<K extends keyof PersonaConfig>(key: K, value: PersonaConfig[K]) => {
    setPersona(prev => ({ ...prev, [key]: value }))
    setActivePreset(null)
  }, [])

  // Handler: Apply preset
  const applyPreset = useCallback((preset: PersonaPreset) => {
    setPersona(prev => ({
      ...prev,
      tone: preset.config.tone,
      responseStyle: preset.config.responseStyle,
      customInstructions: preset.config.customInstructions,
      temperatureOverride: prev.temperatureOverride,
    }))
    setActivePreset(preset.id)
  }, [])

  // Handler: Toggle trait
  const toggleTrait = useCallback((traitId: string) => {
    setPersona(prev => {
      if (prev.traits.includes(traitId)) {
        return { ...prev, traits: prev.traits.filter(t => t !== traitId) }
      }
      if (prev.traits.length >= MAX_TRAITS) return prev
      return { ...prev, traits: [...prev.traits, traitId] }
    })
  }, [])

  // Handler: Toggle response format
  const toggleFormat = useCallback((formatId: string) => {
    setPersona(prev => {
      if (prev.responseFormats.includes(formatId)) {
        return { ...prev, responseFormats: prev.responseFormats.filter(f => f !== formatId) }
      }
      return { ...prev, responseFormats: [...prev.responseFormats, formatId] }
    })
  }, [])

  // Handler: Add knowledge tag
  const addTag = useCallback((tag: string) => {
    const trimmed = tag.trim().toLowerCase().replace(/\s+/g, '-')
    if (!trimmed || persona.knowledgeTags.includes(trimmed) || persona.knowledgeTags.length >= MAX_TAGS) return
    updateField('knowledgeTags', [...persona.knowledgeTags, trimmed])
    setTagInput('')
  }, [persona.knowledgeTags, updateField])

  // Handler: Remove knowledge tag
  const removeTag = useCallback((tag: string) => {
    updateField('knowledgeTags', persona.knowledgeTags.filter(t => t !== tag))
  }, [persona.knowledgeTags, updateField])

  // Handler: Save
  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      const payload = {
        tone: persona.tone,
        responseStyle: persona.responseStyle,
        customInstructions: persona.customInstructions,
        temperatureOverride: temperatureEnabled ? persona.temperatureOverride : null,
        avatar: persona.avatar,
        traits: persona.traits,
        responseLength: persona.responseLength,
        responseFormats: persona.responseFormats,
        tonePreset: persona.tonePreset,
        knowledgeTags: persona.knowledgeTags,
      }
      const res = await fetch(`/api/agents/${agent.id}/persona`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save persona')
      }
      const saved = await res.json()
      setOriginalPersona(saved)
      setTemperatureEnabled(saved.temperatureOverride !== null)
      toast.success('Persona saved successfully!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save persona')
    } finally {
      setIsSaving(false)
    }
  }, [agent.id, persona, temperatureEnabled])

  // Handler: Reset
  const handleReset = useCallback(() => {
    setPersona(DEFAULT_PERSONA)
    setTemperatureEnabled(false)
    setActivePreset(null)
    setResetDialogOpen(false)
    toast.info('Persona reset to defaults')
  }, [])

  // Has unsaved changes
  const hasChanges = useMemo(() => {
    return JSON.stringify(persona) !== JSON.stringify(originalPersona)
      || temperatureEnabled !== (originalPersona.temperatureOverride !== null)
  }, [persona, originalPersona, temperatureEnabled])

  if (isLoading) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="vl-dialog max-w-2xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="vl-text-heading">Agent Persona</DialogTitle>
            <DialogDescription className="vl-text-muted">Loading persona configuration...</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center p-12">
            <Loader2 className="size-8 animate-spin text-emerald-400" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        className="vl-dialog max-w-6xl max-h-[90vh] p-0 overflow-hidden"
        showCloseButton={false}
      >
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <AgentAvatar agent={agent} size="lg" />
                <div
                  className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center bg-[var(--vl-bg-secondary)]"
                >
                  <Sparkles className="size-3 text-emerald-400" />
                </div>
              </div>
              <div>
                <DialogTitle className="vl-text-heading">
                  Persona Editor
                </DialogTitle>
                <DialogDescription className="vl-text-muted">
                  {agent.title} — {agent.expertise.length > 50 ? agent.expertise.substring(0, 50) + '...' : agent.expertise}
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 vl-text-muted hover:text-white hover:bg-[var(--vl-bg-card-hover)]"
              onClick={onClose}
              aria-label={t(lang, 'common.close')}
            >
              <X className="size-4" />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-100px)]">
          <div className="p-6 persona-preview-split content-fade-scale stagger-children">

            {/* LEFT: Editor */}
            <div className="space-y-6 min-w-0">

              {/* Section 1: Persona Presets */}
              <section aria-label="Persona presets">
                <Label className="text-xs font-semibold uppercase tracking-wide vl-text-muted mb-3 block">
                  Quick Presets
                </Label>
                <LayoutGroup>
                  <div className="grid grid-cols-5 gap-2 sm:grid-cols-5">
                    <AnimatePresence mode="popLayout">
                      {PERSONA_PRESETS.map((preset) => (
                        <PresetCard
                          key={preset.id}
                          preset={preset}
                          isSelected={activePreset === preset.id}
                          onClick={() => applyPreset(preset)}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </LayoutGroup>
              </section>

              <div className="vl-section-separator" />

              {/* Section 2: Avatar Builder */}
              <section aria-label="Avatar Builder">
                <Label className="text-xs font-semibold uppercase tracking-wide vl-text-muted mb-3 flex items-center gap-2">
                  <Sparkles className="size-3.5" />
                  {t(lang, 'persona.avatarBuilder')}
                </Label>
                <div className="grid grid-cols-[1fr_auto] gap-4">
                  {/* Shape selector */}
                  <div className="space-y-3">
                    <p className="text-[10px] vl-text-muted font-medium">{t(lang, 'persona.shape')}</p>
                    <div className="flex gap-2">
                      {AVATAR_SHAPES.map(shape => {
                        const ShapeIcon = shape.icon
                        return (
                          <motion.button
                            key={shape.id}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => updateField('avatar', { ...persona.avatar, shape: shape.id })}
                            className={`w-10 h-10 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                              persona.avatar.shape === shape.id
                                ? 'border-emerald-500/50 bg-emerald-500/10'
                                : 'border-[var(--vl-border-subtle)] bg-[var(--vl-bg-inner)] hover:border-[var(--vl-border)]'
                            }`}
                            aria-label={t(lang, shape.labelKey)}
                            aria-pressed={persona.avatar.shape === shape.id}
                          >
                            <ShapeIcon className="size-4" style={{ color: persona.avatar.shape === shape.id ? '#10b981' : 'var(--vl-text-muted)' }} />
                          </motion.button>
                        )
                      })}
                    </div>

                    {/* Gradient selector */}
                    <p className="text-[10px] vl-text-muted font-medium mt-2">{t(lang, 'persona.gradient')}</p>
                    <div className="grid grid-cols-6 gap-2">
                      {AVATAR_GRADIENTS.map(grad => (
                        <motion.button
                          key={grad.id}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => updateField('avatar', { ...persona.avatar, gradient: grad.id })}
                          className={`w-8 h-8 rounded-md ${grad.cssClass} transition-all cursor-pointer ${
                            persona.avatar.gradient === grad.id
                              ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-[var(--vl-bg-secondary)]'
                              : 'opacity-60 hover:opacity-100'
                          }`}
                          aria-label={grad.id}
                          aria-pressed={persona.avatar.gradient === grad.id}
                        />
                      ))}
                    </div>

                    {/* Icon selector */}
                    <p className="text-[10px] vl-text-muted font-medium mt-2">{t(lang, 'persona.icon')}</p>
                    <div className="grid grid-cols-10 gap-1.5">
                      {AVATAR_ICONS.map(ic => {
                        const Ic = ic.icon
                        return (
                          <motion.button
                            key={ic.id}
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.85 }}
                            onClick={() => updateField('avatar', { ...persona.avatar, icon: ic.id })}
                            className={`w-7 h-7 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                              persona.avatar.icon === ic.id
                                ? 'border-emerald-500/50 bg-emerald-500/10'
                                : 'border-[var(--vl-border-subtle)] bg-[var(--vl-bg-inner)] hover:border-[var(--vl-border)]'
                            }`}
                            aria-label={ic.id}
                            aria-pressed={persona.avatar.icon === ic.id}
                          >
                            <Ic className="size-3" style={{ color: persona.avatar.icon === ic.id ? '#10b981' : 'var(--vl-text-muted)' }} />
                          </motion.button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Live Preview */}
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-[10px] vl-text-muted font-medium">{t(lang, 'persona.livePreview')}</p>
                    <motion.div
                      key={`${persona.avatar.shape}-${persona.avatar.gradient}-${persona.avatar.icon}`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      className="rounded-xl p-3 vl-inner border border-[var(--vl-border-subtle)]"
                    >
                      <AvatarSvgPreview
                        shape={persona.avatar.shape}
                        gradientId={persona.avatar.gradient}
                        iconId={persona.avatar.icon}
                        size={64}
                      />
                    </motion.div>
                  </div>
                </div>
              </section>

              <div className="vl-section-separator" />

              {/* Section 3: Personality Traits */}
              <section aria-label="Personality Traits">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-xs font-semibold uppercase tracking-wide vl-text-muted flex items-center gap-2">
                    <Heart className="size-3.5" />
                    {t(lang, 'persona.personality')}
                  </Label>
                  <span className="text-[10px] vl-text-muted">
                    {persona.traits.length}/{MAX_TRAITS}
                  </span>
                </div>
                <div className="space-y-3">
                  {TRAIT_CATEGORIES.map(cat => {
                    const catTraits = PERSONALITY_TRAITS.filter(t => t.category === cat.id)
                    return (
                      <div key={cat.id} className="trait-category">
                        <p className="text-[10px] font-semibold vl-text-muted mb-2">{t(lang, cat.labelKey)}</p>
                        <div className="flex flex-wrap gap-2">
                          {catTraits.map(trait => {
                            const isActive = persona.traits.includes(trait.id)
                            return (
                              <motion.button
                                key={trait.id}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => toggleTrait(trait.id)}
                                disabled={!isActive && persona.traits.length >= MAX_TRAITS}
                                className={`trait-pill ${isActive ? 'trait-pill-active' : ''}`}
                                title={t(lang, trait.descKey)}
                                aria-pressed={isActive}
                              >
                                {isActive && (
                                  <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    style={{ width: 6, height: 6 }}
                                    className="rounded-full bg-emerald-400"
                                  />
                                )}
                                <span>{t(lang, trait.nameKey)}</span>
                              </motion.button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>

              <div className="vl-section-separator" />

              {/* Section 4: Response Style */}
              <section aria-label="Response Style">
                <Label className="text-xs font-semibold uppercase tracking-wide vl-text-muted mb-3 flex items-center gap-2">
                  <SlidersHorizontal className="size-3.5" />
                  {t(lang, 'persona.responseStyle')}
                </Label>

                {/* Response Length */}
                <div className="space-y-2 mb-4">
                  <p className="text-[10px] vl-text-muted font-medium">{t(lang, 'persona.length')}</p>
                  <Slider
                    value={[persona.responseLength]}
                    onValueChange={([v]) => updateField('responseLength', v)}
                    min={0}
                    max={3}
                    step={1}
                  />
                  <div className="flex justify-between">
                    {RESPONSE_LENGTH_LABELS.map((label, i) => (
                      <span key={label} className={`text-[10px] ${persona.responseLength === i ? 'text-emerald-400 font-semibold' : 'vl-text-muted'}`}>
                        {label}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Response Format */}
                <div className="space-y-2 mb-4">
                  <p className="text-[10px] vl-text-muted font-medium">{t(lang, 'persona.format')}</p>
                  <div className="flex flex-wrap gap-2">
                    {RESPONSE_FORMATS.map(fmt => {
                      const isActive = persona.responseFormats.includes(fmt.id)
                      return (
                        <motion.button
                          key={fmt.id}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => toggleFormat(fmt.id)}
                          className={`trait-pill ${isActive ? 'trait-pill-active' : ''}`}
                          aria-pressed={isActive}
                        >
                          {isActive && (
                            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ width: 6, height: 6 }} className="rounded-full bg-emerald-400" />
                          )}
                          <span>{t(lang, fmt.labelKey)}</span>
                        </motion.button>
                      )
                    })}
                  </div>
                </div>

                {/* Tone Presets */}
                <div className="space-y-2 mb-4">
                  <p className="text-[10px] vl-text-muted font-medium">{t(lang, 'persona.tonePresets')}</p>
                  <div className="flex flex-wrap gap-2">
                    {TONE_PRESETS.map(tp => {
                      const isActive = persona.tonePreset === tp.id
                      return (
                        <motion.button
                          key={tp.id}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => updateField('tonePreset', tp.id)}
                          className={`trait-pill ${isActive ? 'trait-pill-active' : ''}`}
                          aria-pressed={isActive}
                        >
                          {isActive && (
                            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ width: 6, height: 6 }} className="rounded-full bg-emerald-400" />
                          )}
                          <span>{t(lang, tp.labelKey)}</span>
                        </motion.button>
                      )
                    })}
                  </div>
                </div>
              </section>

              <div className="vl-section-separator" />

              {/* Section 5: Tone Slider (existing) */}
              <section aria-label="Tone configuration">
                <Label className="text-xs font-semibold uppercase tracking-wide vl-text-muted mb-3 flex items-center gap-2">
                  <ThermometerSun className="size-3.5" />
                  Tone Level
                </Label>
                <ToneSlider
                  value={toneValue}
                  onChange={(v) => {
                    const toneNames = ['professional', 'academic', 'neutral', 'casual', 'enthusiastic']
                    updateField('tone', toneNames[v - 1] || 'neutral')
                  }}
                />
              </section>

              <div className="vl-section-separator" />

              {/* Section 6: Response Style (existing) */}
              <section aria-label="Response style">
                <Label className="text-xs font-semibold uppercase tracking-wide vl-text-muted mb-3 flex items-center gap-2">
                  <MessageSquare className="size-3.5" />
                  Response Style
                </Label>
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {RESPONSE_STYLES.map((option) => (
                      <ResponseStyleCard
                        key={option.value}
                        option={option}
                        isSelected={persona.responseStyle === option.value}
                        onClick={() => updateField('responseStyle', option.value)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </section>

              <div className="vl-section-separator" />

              {/* Section 7: Custom Instructions */}
              <section aria-label="Custom instructions">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-xs font-semibold uppercase tracking-wide vl-text-muted">
                    Custom Instructions
                  </Label>
                  <span className={`text-[10px] tabular-nums ${
                    persona.customInstructions.length >= MAX_CUSTOM_INSTRUCTIONS
                      ? 'text-red-400'
                      : 'vl-text-muted'
                  }`}>
                    {persona.customInstructions.length}/{MAX_CUSTOM_INSTRUCTIONS}
                  </span>
                </div>
                <Textarea
                  value={persona.customInstructions}
                  onChange={(e) => {
                    if (e.target.value.length <= MAX_CUSTOM_INSTRUCTIONS) {
                      updateField('customInstructions', e.target.value)
                    }
                  }}
                  placeholder="Add specific instructions for this agent's personality..."
                  className="vl-input min-h-[80px] resize-y text-sm"
                  maxLength={MAX_CUSTOM_INSTRUCTIONS}
                />
              </section>

              <div className="vl-section-separator" />

              {/* Section 8: Knowledge Base Tags */}
              <section aria-label="Knowledge Base Tags">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-xs font-semibold uppercase tracking-wide vl-text-muted flex items-center gap-2">
                    <Tag className="size-3.5" />
                    {t(lang, 'persona.knowledgeBase')}
                  </Label>
                  <span className="text-[10px] vl-text-muted">
                    {persona.knowledgeTags.length}/{MAX_TAGS}
                  </span>
                </div>

                {/* Existing tags */}
                {persona.knowledgeTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <AnimatePresence>
                      {persona.knowledgeTags.map(tag => (
                        <motion.span
                          key={tag}
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.5 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                          className="knowledge-tag"
                        >
                          {tag}
                          <button
                            onClick={() => removeTag(tag)}
                            className="ml-0.5 hover:text-red-400 transition-colors cursor-pointer"
                            aria-label={t(lang, 'common.remove')}
                          >
                            <Minus className="size-3" />
                          </button>
                        </motion.span>
                      ))}
                    </AnimatePresence>
                  </div>
                )}

                {/* Add tag input */}
                {persona.knowledgeTags.length < MAX_TAGS && (
                  <div className="relative">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && tagInput.trim()) {
                          e.preventDefault()
                          addTag(tagInput)
                        }
                      }}
                      placeholder={t(lang, 'persona.addTag')}
                      className="vl-input text-xs h-8"
                    />
                  </div>
                )}

                {/* Suggested tags */}
                {suggestedTags.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[10px] vl-text-muted font-medium mb-2">{t(lang, 'persona.suggested')}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {suggestedTags.map(tag => (
                        <motion.button
                          key={tag}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => addTag(tag)}
                          className="knowledge-tag-suggestion"
                        >
                          <Plus className="size-3" />
                          {tag}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              <div className="vl-section-separator" />

              {/* Section 9: Temperature Override */}
              <section aria-label="Temperature override">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-xs font-semibold uppercase tracking-wide vl-text-muted flex items-center gap-2">
                    <ThermometerSun className="size-3.5" />
                    Temperature Override
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] vl-text-muted">
                      {temperatureEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                    <Switch
                      checked={temperatureEnabled}
                      onCheckedChange={(checked) => {
                        setTemperatureEnabled(checked)
                        if (checked && persona.temperatureOverride === null) {
                          updateField('temperatureOverride', 0.7)
                        }
                        if (!checked) {
                          updateField('temperatureOverride', null)
                        }
                      }}
                    />
                  </div>
                </div>
                <AnimatePresence>
                  {temperatureEnabled && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 rounded-xl vl-inner border border-[var(--vl-border-subtle)] space-y-3">
                        <Slider
                          value={[persona.temperatureOverride ?? 0.7]}
                          onValueChange={([v]) => updateField('temperatureOverride', v)}
                          min={0}
                          max={2}
                          step={0.1}
                        />
                        <div className="flex justify-between">
                          <span className="text-[10px] vl-text-muted">Conservative (0)</span>
                          <motion.span layout className="text-xs font-semibold tabular-nums text-emerald-400">
                            {((persona.temperatureOverride ?? 0.7)).toFixed(1)}
                          </motion.span>
                          <span className="text-[10px] vl-text-muted">Creative (2)</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>

            </div>

            {/* RIGHT: Preview Panel */}
            <div className="min-w-0 lg:sticky lg:top-0">
              <PersonaPreviewPanel agent={agent} persona={persona} lang={lang} />
            </div>

          </div>
        </ScrollArea>

        {/* Footer: Save / Reset */}
        <DialogFooter className="p-4 border-t border-[var(--vl-border-subtle)] flex items-center gap-2 sm:justify-between">
          <div className="flex items-center gap-2">
            {hasChanges && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-[10px] text-amber-400 flex items-center gap-1"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Unsaved changes
              </motion.span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="vl-text-muted hover:text-red-400 hover:bg-red-500/10"
                >
                  <RotateCcw className="size-3.5 mr-1.5" />
                  {t(lang, 'common.reset')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="vl-dialog">
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset Persona?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will reset all persona settings to their defaults. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="vl-text-muted">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleReset}
                    className="bg-red-500 hover:bg-red-600 text-white"
                  >
                    Reset to Defaults
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white neon-glow-emerald magnetic-hover"
              size="sm"
            >
              {isSaving ? (
                <Loader2 className="size-3.5 mr-1.5 animate-spin" />
              ) : (
                <Save className="size-3.5 mr-1.5" />
              )}
              {isSaving ? 'Saving...' : t(lang, 'common.save')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
