'use client'

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, MicOff, X, Loader2, CheckCircle2, AlertCircle,
  ChevronRight, Volume2, VolumeX, Info, Sparkles,
  RotateCcw, Trash2, Command,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import type { Agent } from './shared-components'
import { useVoiceInput, VOICE_LANGUAGES } from './voice-input-hook'

// ============================================================
// Types
// ============================================================

export interface VoiceMeetingConfig {
  agenda: string
  leadId: string
  memberIds: string[]
  rounds: number
  temperature: number
}

interface VoiceCommand {
  type: 'agenda' | 'lead' | 'rounds' | 'temperature' | 'unknown'
  raw: string
  value: string
  confidence: number
}

interface VoiceMeetingCreatorProps {
  agents: Agent[]
  lang: Lang
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (config: VoiceMeetingConfig) => void
}

// ============================================================
// Natural Language Parser
// ============================================================

function parseVoiceCommands(
  transcript: string,
  agents: Agent[],
  lang: Lang
): VoiceCommand[] {
  const commands: VoiceCommand[] = []
  const lower = transcript.toLowerCase().trim()
  const agentNames = agents.map(a => a.title.toLowerCase())
  const agentNameMap: Record<string, string> = {}
  agents.forEach(a => { agentNameMap[a.title.toLowerCase()] = a.id })

  // Extract agenda/topic: "create a team meeting about [topic]"
  const agendaPatterns = lang === 'zh'
    ? [/关于(.+)/, /议题[是为：:](.+)/, /讨论(.+)/]
    : [/about\s+(.+?)(?:\.|,|$)/, /agenda\s+(?:is\s+)?(.+?)(?:\.|,|$)/, /topic\s+(?:is\s+)?(.+?)(?:\.|,|$)/, /discuss(?:ing)?\s+(.+?)(?:\.|,|$)/]

  for (const pattern of agendaPatterns) {
    const match = lower.match(pattern)
    if (match?.[1]?.trim()) {
      commands.push({
        type: 'agenda',
        raw: transcript,
        value: match[1].trim(),
        confidence: 0.9,
      })
      break
    }
  }

  // If no agenda pattern, treat the whole transcript as agenda if it's substantial
  if (!commands.some(c => c.type === 'agenda') && lower.length > 10) {
    commands.push({
      type: 'agenda',
      raw: transcript,
      value: transcript.trim(),
      confidence: 0.6,
    })
  }

  // Extract lead agent: "add [name] as lead"
  const leadPatterns = lang === 'zh'
    ? [/将\s*(.+?)\s*设?为.*负责人/, /(.+?)\s*作为.*负责人/, /负责人.*?(.+?)(?:\.|,|$)/]
    : [/add\s+(.+?)\s+as\s+lead/, /set\s+(.+?)\s+as\s+lead/, /make\s+(.+?)\s+the?\s*lead/]

  for (const pattern of leadPatterns) {
    const match = lower.match(pattern)
    if (match?.[1]?.trim()) {
      const matchedName = match[1].trim()
      const matchedAgent = agentNames.find(n => n.includes(matchedName) || matchedName.includes(n))
      if (matchedAgent) {
        commands.push({
          type: 'lead',
          raw: transcript,
          value: agentNameMap[matchedAgent] || matchedAgent,
          confidence: 0.85,
        })
      }
      break
    }
  }

  // Try to match any agent name as lead (first mentioned agent)
  if (!commands.some(c => c.type === 'lead')) {
    for (const name of agentNames) {
      if (lower.includes(name)) {
        commands.push({
          type: 'lead',
          raw: transcript,
          value: agentNameMap[name],
          confidence: 0.7,
        })
        break
      }
    }
  }

  // Extract rounds: "set rounds to [number]"
  const roundsPatterns = lang === 'zh'
    ? [/轮次.*?(\d+)/, /(\d+)\s*轮/]
    : [/rounds?\s+(?:to\s+|equals?\s+|=)?(\d+)/, /(\d+)\s+rounds?/]

  for (const pattern of roundsPatterns) {
    const match = lower.match(pattern)
    if (match?.[1]) {
      const num = parseInt(match[1], 10)
      if (num > 0 && num <= 20) {
        commands.push({
          type: 'rounds',
          raw: transcript,
          value: String(num),
          confidence: 0.9,
        })
      }
      break
    }
  }

  // Extract temperature: "set temperature to [number]"
  const tempPatterns = lang === 'zh'
    ? [/温度.*?([\d.]+)/, /([\d.]+)\s*温度/]
    : [/temperature\s+(?:to\s+)?([\d.]+)/, /temp\s+(?:to\s+)?([\d.]+)/]

  for (const pattern of tempPatterns) {
    const match = lower.match(pattern)
    if (match?.[1]) {
      const num = parseFloat(match[1])
      if (num >= 0 && num <= 2) {
        commands.push({
          type: 'temperature',
          raw: transcript,
          value: String(Math.round(num * 100) / 100),
          confidence: 0.9,
        })
      }
      break
    }
  }

  // If nothing recognized
  if (commands.length === 0) {
    commands.push({
      type: 'unknown',
      raw: transcript,
      value: transcript,
      confidence: 0,
    })
  }

  return commands
}

// ============================================================
// Waveform Visualization (CSS-only bars)
// ============================================================

function AudioWaveform({ isRecording, barCount = 12, className = '' }: {
  isRecording: boolean
  barCount?: number
  className?: string
}) {
  return (
    <AnimatePresence>
      {isRecording && (
        <motion.div
          initial={{ opacity: 0, scaleX: 0.5 }}
          animate={{ opacity: 1, scaleX: 1 }}
          exit={{ opacity: 0, scaleX: 0.5 }}
          className={`flex items-center gap-[2px] h-8 ${className}`}
          aria-hidden="true"
        >
          {Array.from({ length: barCount }).map((_, i) => (
            <div
              key={i}
              className="voice-waveform-bar text-red-400"
              style={{
                height: '100%',
                animationDuration: `${0.3 + Math.random() * 0.5}s`,
                animationDelay: `${i * 0.04}s`,
              }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ============================================================
// Mic Button with States
// ============================================================

type MicState = 'idle' | 'recording' | 'processing'

function AnimatedMicButton({ state, onClick, lang }: {
  state: MicState
  onClick: () => void
  lang: Lang
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      disabled={state === 'processing'}
      className={`
        relative flex items-center justify-center w-14 h-14 rounded-full
        transition-all duration-300 cursor-pointer
        ${state === 'idle'
          ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/40 hover:bg-emerald-500/30 hover:border-emerald-500/60'
          : state === 'recording'
            ? 'bg-red-500/20 text-red-400 border-2 border-red-500/60 shadow-[0_0_0_4px_rgba(239,68,68,0.2)]'
            : 'bg-amber-500/20 text-amber-400 border-2 border-amber-500/40 cursor-wait'
        }
      `}
      aria-label={
        state === 'idle'
          ? t(lang, 'voiceMeeting.startRecording')
          : state === 'recording'
            ? t(lang, 'voiceMeeting.stopRecording')
            : t(lang, 'voiceMeeting.processing')
      }
    >
      {/* Idle icon */}
      {state === 'idle' && <Mic className="size-6" />}
      {/* Recording icon with pulse ring */}
      {state === 'recording' && (
        <>
          <Mic className="size-6" />
          <span className="absolute inset-0 rounded-full" style={{
            border: '2px solid rgba(239, 68, 68, 0.5)',
            animation: 'voice-pulse-ring 1.2s ease-out infinite',
          }} />
        </>
      )}
      {/* Processing icon with spin ring */}
      {state === 'processing' && (
        <>
          <span className="absolute inset-0 rounded-full voice-processing-ring" />
          <Loader2 className="size-6 animate-spin" />
        </>
      )}
    </motion.button>
  )
}

// ============================================================
// Command Reference Card
// ============================================================

function VoiceCommandReference({ lang }: { lang: Lang }) {
  const enCommands = [
    { cmd: 'Create a team meeting about [topic]', desc: 'Sets the agenda' },
    { cmd: 'Add [agent name] as lead', desc: 'Sets the team lead' },
    { cmd: 'Set rounds to [number]', desc: 'Sets discussion rounds (1-20)' },
    { cmd: 'Set temperature to [number]', desc: 'Sets creativity level (0-2)' },
  ]
  const zhCommands = [
    { cmd: '创建一个关于[主题]的团队会议', desc: '设置议程' },
    { cmd: '将[智能体名称]设为负责人', desc: '设置团队负责人' },
    { cmd: '设置轮次为[数字]', desc: '设置讨论轮次（1-20）' },
    { cmd: '设置温度为[数字]', desc: '设置创造力水平（0-2）' },
  ]
  const commands = lang === 'zh' ? zhCommands : enCommands

  return (
    <Card className="vl-inner border-[var(--vl-border-subtle)]">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-xs font-medium flex items-center gap-1.5 vl-text-muted">
          <Command className="size-3" />
          {t(lang, 'voiceMeeting.commandRef')}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        <div className="space-y-1.5">
          {commands.map((c, i) => (
            <div key={i} className="flex items-start gap-2 text-[11px]">
              <ChevronRight className="size-3 text-emerald-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-mono text-emerald-400/90">{c.cmd}</p>
                <p className="vl-text-muted mt-0.5">{c.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// VoiceMeetingCreator — Main Component
// ============================================================

export function VoiceMeetingCreator({
  agents,
  lang,
  isOpen,
  onOpenChange,
  onSubmit,
}: VoiceMeetingCreatorProps) {
  // Mic state
  const [micState, setMicState] = useState<MicState>('idle')

  // Parsed config
  const [agenda, setAgenda] = useState('')
  const [leadId, setLeadId] = useState('')
  const [memberIds, setMemberIds] = useState<string[]>([])
  const [rounds, setRounds] = useState(3)
  const [temperature, setTemperature] = useState(0.2)

  // Transcript log
  const [transcriptLog, setTranscriptLog] = useState<string[]>([])

  // Parsed commands
  const [parsedCommands, setParsedCommands] = useState<VoiceCommand[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestedText, setSuggestedText] = useState('')

  // Confirmation dialog
  const [showConfirm, setShowConfirm] = useState(false)

  // Voice language based on i18n lang
  const voiceLang = lang === 'zh' ? 'zh-CN' : 'en-US'

  const {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    start,
    stop,
    reset,
    error: voiceError,
  } = useVoiceInput({ lang: voiceLang, continuous: true, interimResults: true })

  // Sync mic state with voice hook
  useEffect(() => {
    if (isListening) {
      requestAnimationFrame(() => setMicState('recording'))
    }
  }, [isListening])

  // Process final transcript
  useEffect(() => {
    if (transcript && !isListening && micState === 'recording') {
      requestAnimationFrame(() => setMicState('processing'))

      // Add to log
      requestAnimationFrame(() => setTranscriptLog(prev => [...prev, transcript]))

      // Parse commands
      const commands = parseVoiceCommands(transcript, agents, lang)
      requestAnimationFrame(() => setParsedCommands(prev => [...prev, ...commands]))

      // Apply commands
      requestAnimationFrame(() => {
        commands.forEach(cmd => {
          if (cmd.type === 'agenda' && cmd.confidence >= 0.5) {
            setAgenda(prev => prev ? prev + ' ' + cmd.value : cmd.value)
          } else if (cmd.type === 'lead' && cmd.confidence >= 0.5) {
            setLeadId(cmd.value)
          } else if (cmd.type === 'rounds' && cmd.confidence >= 0.5) {
            setRounds(parseInt(cmd.value, 10))
          } else if (cmd.type === 'temperature' && cmd.confidence >= 0.5) {
            setTemperature(parseFloat(cmd.value))
          } else if (cmd.type === 'unknown') {
            setShowSuggestions(true)
            setSuggestedText(cmd.value)
          }
        })

        setMicState('idle')
      })
    }
  }, [transcript, isListening, micState, agents, lang])

  // Auto-add lead to members
  useEffect(() => {
    if (leadId && !memberIds.includes(leadId)) {
      requestAnimationFrame(() => setMemberIds(prev => [...prev, leadId]))
    }
  }, [leadId, memberIds])

  const handleStartRecording = useCallback(() => {
    if (!isSupported) {
      toast.error(t(lang, 'voice.notSupported'))
      return
    }
    reset()
    start()
  }, [isSupported, reset, start, lang])

  const handleStopRecording = useCallback(() => {
    stop()
  }, [stop])

  const handleClear = useCallback(() => {
    setAgenda('')
    setLeadId('')
    setMemberIds([])
    setRounds(3)
    setTemperature(0.2)
    setTranscriptLog([])
    setParsedCommands([])
    setShowSuggestions(false)
    setSuggestedText('')
  }, [])

  const handleSubmit = useCallback(() => {
    if (!agenda.trim()) {
      toast.error(t(lang, 'voiceMeeting.agendaRequired'))
      return
    }
    onSubmit({ agenda, leadId, memberIds, rounds, temperature })
    handleClear()
    onOpenChange(false)
    toast.success(t(lang, 'voiceMeeting.meetingCreated'))
  }, [agenda, leadId, memberIds, rounds, temperature, onSubmit, onOpenChange, lang, handleClear])

  const handleClose = useCallback(() => {
    if (isListening) stop()
    handleClear()
    onOpenChange(false)
  }, [isListening, stop, handleClear, onOpenChange])

  const leadAgent = agents.find(a => a.id === leadId)

  const isValid = agenda.trim().length > 0

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(v) => { if (!v) handleClose(); else onOpenChange(v) }}>
        <DialogContent className="vl-dialog sm:max-w-lg max-h-[85vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="vl-text-heading flex items-center gap-2">
              <Volume2 className="size-5 text-emerald-400" />
              {t(lang, 'voiceMeeting.title')}
            </DialogTitle>
            <DialogDescription className="vl-text-muted">
              {t(lang, 'voiceMeeting.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Not supported warning */}
            {!isSupported && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <AlertCircle className="size-4 text-red-400 flex-shrink-0" />
                <p className="text-xs text-red-400">{t(lang, 'voice.notSupported')}</p>
              </div>
            )}

            {/* Mic Button + Waveform */}
            <div className="flex flex-col items-center gap-3 py-2">
              <AnimatedMicButton
                state={micState}
                onClick={micState === 'idle' ? handleStartRecording : handleStopRecording}
                lang={lang}
              />
              <AudioWaveform isRecording={micState === 'recording'} />
              {micState === 'recording' && (interimTranscript || transcript) && (
                <motion.p
                  key="interim"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-emerald-400/80 italic max-w-[320px] text-center truncate"
                >
                  {(transcript + interimTranscript).slice(-80)}
                </motion.p>
              )}
              {micState === 'processing' && (
                <p className="text-xs text-amber-400/80 flex items-center gap-1">
                  <Loader2 className="size-3 animate-spin" />
                  {t(lang, 'voiceMeeting.processing')}
                </p>
              )}
            </div>

            {/* Live Transcription Log */}
            {transcriptLog.length > 0 && (
              <Card className="vl-inner border-[var(--vl-border-subtle)]">
                <CardHeader className="pb-2 pt-3 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-medium vl-text-muted flex items-center gap-1.5">
                      <Volume2 className="size-3" />
                      {t(lang, 'voiceMeeting.transcriptLog')}
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] vl-text-muted" onClick={() => setTranscriptLog([])}>
                      <Trash2 className="size-3 mr-1" /> {t(lang, 'common.clear')}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-3 pt-0 max-h-32 overflow-y-auto custom-scrollbar">
                  {transcriptLog.map((txt, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11px] mb-1.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <p className="vl-text-body">{txt}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Parsed Config Preview */}
            {(agenda || leadId || rounds !== 3 || temperature !== 0.2) && (
              <Card className="vl-inner border-[var(--vl-border-subtle)]">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-xs font-medium vl-text-muted flex items-center gap-1.5">
                    <Sparkles className="size-3" />
                    {t(lang, 'voiceMeeting.parsedConfig')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3 pt-0">
                  <div className="grid grid-cols-2 gap-2">
                    {agenda && (
                      <div className="col-span-2 p-2 rounded-md bg-emerald-500/5 border border-emerald-500/20">
                        <p className="text-[10px] vl-text-muted mb-0.5">{t(lang, 'meeting.agenda')}</p>
                        <p className="text-xs vl-text-body line-clamp-2">{agenda}</p>
                      </div>
                    )}
                    {leadAgent && (
                      <div className="p-2 rounded-md bg-cyan-500/5 border border-cyan-500/20">
                        <p className="text-[10px] vl-text-muted mb-0.5">{t(lang, 'meeting.teamLead')}</p>
                        <p className="text-xs vl-text-body">{leadAgent.title}</p>
                      </div>
                    )}
                    <div className="p-2 rounded-md bg-amber-500/5 border border-amber-500/20">
                      <p className="text-[10px] vl-text-muted mb-0.5">{t(lang, 'meeting.rounds')}</p>
                      <p className="text-xs vl-text-body">{rounds}</p>
                    </div>
                    {temperature !== 0.2 && (
                      <div className="p-2 rounded-md bg-violet-500/5 border border-violet-500/20">
                        <p className="text-[10px] vl-text-muted mb-0.5">{t(lang, 'meeting.temperature')}</p>
                        <p className="text-xs vl-text-body">{temperature}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Suggestions for unrecognized commands */}
            <AnimatePresence>
              {showSuggestions && suggestedText && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30"
                >
                  <Info className="size-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-amber-400 font-medium">{t(lang, 'voiceMeeting.notRecognized')}</p>
                    <p className="text-[11px] text-amber-400/70 mt-1">&quot;{suggestedText.slice(0, 60)}&quot;</p>
                    <p className="text-[10px] text-amber-400/50 mt-1">
                      {lang === 'zh'
                        ? '请尝试使用参考命令，例如"创建一个关于[主题]的团队会议"'
                        : 'Try commands like "Create a team meeting about [topic]"'
                      }
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 mt-1.5 text-[10px] text-amber-400 hover:text-amber-300"
                      onClick={() => { setShowSuggestions(false); setSuggestedText('') }}
                    >
                      {t(lang, 'common.close')}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Voice error */}
            {voiceError && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="size-3" />
                {t(lang, voiceError)}
              </p>
            )}

            {/* Command Reference */}
            <VoiceCommandReference lang={lang} />

            {/* Actions */}
            <div className="flex items-center gap-2 justify-end pt-2">
              <Button variant="ghost" size="sm" className="h-8 text-xs vl-text-muted" onClick={handleClear}>
                <RotateCcw className="size-3 mr-1" /> {t(lang, 'common.reset')}
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs"
                disabled={!isValid}
                onClick={() => setShowConfirm(true)}
              >
                <CheckCircle2 className="size-3 mr-1" /> {t(lang, 'voiceMeeting.confirmCreate')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="vl-dialog sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="vl-text-heading text-sm">
              {t(lang, 'voiceMeeting.confirmTitle')}
            </DialogTitle>
            <DialogDescription className="vl-text-muted text-xs">
              {t(lang, 'voiceMeeting.confirmDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="outline" className="text-[10px]">{t(lang, 'meeting.agenda')}</Badge>
              <span className="vl-text-body truncate">{agenda.slice(0, 80)}</span>
            </div>
            {leadAgent && (
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="outline" className="text-[10px]">{t(lang, 'meeting.teamLead')}</Badge>
                <span className="vl-text-body">{leadAgent.title}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="outline" className="text-[10px]">{t(lang, 'meeting.rounds')}</Badge>
              <span className="vl-text-body">{rounds}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="outline" className="text-[10px]">{t(lang, 'meeting.temperature')}</Badge>
              <span className="vl-text-body">{temperature}</span>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setShowConfirm(false)}>
              {t(lang, 'common.cancel')}
            </Button>
            <Button size="sm" className="h-8 text-xs" onClick={handleSubmit}>
              <CheckCircle2 className="size-3 mr-1" /> {t(lang, 'common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ============================================================
// Voice Create Floating Button
// ============================================================

export function VoiceCreateButton({ onClick, lang }: { onClick: () => void; lang: Lang }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-medium hover:bg-emerald-500/25 hover:border-emerald-500/50 transition-all duration-200 cursor-pointer"
      aria-label={t(lang, 'voiceMeeting.voiceCreateBtn')}
    >
      <Mic className="size-3.5" />
      <span>{t(lang, 'voiceMeeting.voiceCreateBtn')}</span>
    </motion.button>
  )
}
