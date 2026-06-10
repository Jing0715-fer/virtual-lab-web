'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Mic, MicOff, X, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

// ============================================================
// Types
// ============================================================

export interface VoiceInputOptions {
  lang?: string
  continuous?: boolean
  interimResults?: boolean
  maxAlternatives?: number
  silenceTimeout?: number
}

export interface VoiceInputResult {
  transcript: string
  confidence: number
  isFinal: boolean
}

interface SpeechRecognitionEvent {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent {
  error: string
  message: string
}

// ============================================================
// Speech Recognition Type Declarations
// ============================================================

interface SpeechRecognition extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition
    webkitSpeechRecognition?: new () => SpeechRecognition
  }
}

// ============================================================
// Language options for dropdown
// ============================================================

export const VOICE_LANGUAGES = [
  { code: 'en-US', label: 'English (US)' },
  { code: 'zh-CN', label: '中文 (简体)' },
  { code: 'ja-JP', label: '日本語' },
  { code: 'ko-KR', label: '한국어' },
] as const

// ============================================================
// useVoiceInput Hook
// ============================================================

export function useVoiceInput(options: VoiceInputOptions = {}) {
  const {
    lang = 'en-US',
    continuous = true,
    interimResults = true,
    maxAlternatives = 1,
    silenceTimeout = 5000,
  } = options

  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [isSupported, setIsSupported] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSpeechTimeRef = useRef<number>(Date.now())

  // Check browser support on mount
  useEffect(() => {
    const supported = typeof window !== 'undefined' &&
      !!(window.SpeechRecognition || window.webkitSpeechRecognition)
    setIsSupported(supported)
  }, [])

  // Reset silence timer on interim results
  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
    }
    lastSpeechTimeRef.current = Date.now()
    silenceTimerRef.current = setTimeout(() => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }, silenceTimeout)
  }, [silenceTimeout])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
      }
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [])

  const start = useCallback(() => {
    if (!isSupported) {
      setError('voice.error.notSupported')
      return
    }

    setError(null)
    setTranscript('')
    setInterimTranscript('')

    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognitionCtor) return

    const recognition = new SpeechRecognitionCtor()
    recognition.lang = lang
    recognition.continuous = continuous
    recognition.interimResults = interimResults
    recognition.maxAlternatives = maxAlternatives

    recognition.onstart = () => {
      setIsListening(true)
      resetSilenceTimer()
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      resetSilenceTimer()
      let finalTranscript = ''
      let interim = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalTranscript += result[0].transcript
        } else {
          interim += result[0].transcript
        }
      }

      if (finalTranscript) {
        setTranscript(prev => prev + finalTranscript)
      }
      setInterimTranscript(interim)
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const errorMap: Record<string, string> = {
        'not-allowed': 'voice.error.notAllowed',
        'no-speech': 'voice.error.noSpeech',
        'audio-capture': 'voice.error.noMicrophone',
        'network': 'voice.error.network',
        'aborted': 'voice.error.aborted',
        'service-not-allowed': 'voice.error.notAllowed',
      }
      setError(errorMap[event.error] || 'voice.error.unknown')
      setIsListening(false)
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    }

    recognition.onend = () => {
      setIsListening(false)
      setInterimTranscript('')
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    }

    recognitionRef.current = recognition
    try {
      recognition.start()
    } catch (_e) {
      setError('voice.error.failed')
      setIsListening(false)
    }
  }, [isSupported, lang, continuous, interimResults, maxAlternatives, resetSilenceTimer])

  const stop = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
    }
    setIsListening(false)
    setInterimTranscript('')
  }, [isListening])

  const reset = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
    setError(null)
  }, [])

  return {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    start,
    stop,
    reset,
    error,
  }
}

// ============================================================
// VoiceInputButton Component
// ============================================================

export function VoiceInputButton({
  lang,
  listeningLang,
  onResult,
  isRecording: externalIsRecording,
  compact = false,
}: {
  lang: Lang
  listeningLang?: string
  onResult?: (text: string) => void
  isRecording?: boolean
  compact?: boolean
}) {
  const [selectedVoiceLang, setSelectedVoiceLang] = useState(listeningLang || 'en-US')
  const [showLangDropdown, setShowLangDropdown] = useState(false)
  const { isListening, transcript, interimTranscript, isSupported, start, stop, reset, error } = useVoiceInput({
    lang: selectedVoiceLang,
  })

  // Sync external recording state
  const isRecording = externalIsRecording ?? isListening

  // When transcript changes, call onResult
  useEffect(() => {
    if (onResult && transcript && !isListening) {
      onResult(transcript)
    }
  }, [transcript, isListening, onResult])

  const handleToggle = () => {
    if (isListening) {
      stop()
    } else {
      reset()
      start()
    }
  }

  if (!isSupported) return null

  const selectedLangLabel = VOICE_LANGUAGES.find(l => l.code === selectedVoiceLang)?.label || selectedVoiceLang

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex items-center gap-1.5">
        {/* Voice Button */}
        <motion.button
          type="button"
          onClick={handleToggle}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          className={`
            relative flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer
            ${compact ? 'w-8 h-8' : 'w-9 h-9'}
            ${isRecording
              ? 'bg-red-500/20 text-red-400 shadow-[0_0_0_3px_rgba(239,68,68,0.3)] voice-recording-ring'
              : 'bg-[var(--vl-bg-inner)] text-[var(--vl-text-muted)] hover:text-emerald-400 hover:bg-emerald-500/10 border border-[var(--vl-border-subtle)]'
            }
          `}
          aria-label={isRecording ? t(lang, 'voice.stopListening') : t(lang, 'voice.startListening')}
        >
          {isRecording ? (
            <MicOff className={compact ? 'size-3.5' : 'size-4'} />
          ) : (
            <Mic className={compact ? 'size-3.5' : 'size-4'} />
          )}
          {/* Pulse ring when active */}
          {isRecording && (
            <span className="absolute inset-0 rounded-full voice-pulse-ring" />
          )}
        </motion.button>

        {/* Language Dropdown */}
        {isRecording && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowLangDropdown(!showLangDropdown)}
              className="flex items-center gap-1 px-2 py-1 text-[10px] rounded-md bg-[var(--vl-bg-inner)] border border-[var(--vl-border-subtle)] vl-text-muted hover:text-emerald-400 hover:border-emerald-500/40 transition-colors cursor-pointer"
            >
              <Globe className="size-2.5" />
              <span>{selectedVoiceLang.split('-')[0].toUpperCase()}</span>
            </button>
            {showLangDropdown && (
              <div className="absolute top-full left-0 mt-1 z-50 min-w-[140px] py-1 rounded-lg vl-dialog border border-[var(--vl-border)] shadow-lg">
                {VOICE_LANGUAGES.map(vl => (
                  <button
                    key={vl.code}
                    type="button"
                    onClick={() => {
                      setSelectedVoiceLang(vl.code)
                      setShowLangDropdown(false)
                      stop()
                      setTimeout(() => start(), 100)
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs transition-colors cursor-pointer ${
                      selectedVoiceLang === vl.code
                        ? 'text-emerald-400 bg-emerald-500/10'
                        : 'vl-text-muted hover:text-[var(--vl-text-white)] hover:bg-[var(--vl-bg-card-hover)]'
                    }`}
                  >
                    {vl.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Interim transcript display */}
      {isRecording && (interimTranscript || transcript) && (
        <div className="max-w-[200px] w-full">
          <p className="text-[10px] text-emerald-400/80 italic truncate voice-interim-text">
            {(transcript + interimTranscript).slice(-60)}
          </p>
        </div>
      )}

      {/* Waveform indicator */}
      {isRecording && (
        <div className="flex items-center gap-[2px] h-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <motion.div
              key={i}
              className="w-[3px] rounded-full bg-red-400"
              animate={{
                height: [4, 12 + Math.random() * 8, 4],
              }}
              transition={{
                duration: 0.4 + i * 0.1,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.05,
              }}
            />
          ))}
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="text-[10px] text-red-400">
          {t(lang, error)}
        </p>
      )}
    </div>
  )
}

// ============================================================
// VoiceTextInput Component
// ============================================================

export function VoiceTextInput({
  lang,
  value,
  onChange,
  placeholder,
  mode = 'replace',
  listeningLang,
  multiline = false,
  className = '',
  inputClassName = '',
}: {
  lang: Lang
  value: string
  onChange: (value: string) => void
  placeholder?: string
  mode?: 'replace' | 'append'
  listeningLang?: string
  multiline?: boolean
  className?: string
  inputClassName?: string
}) {
  const [localText, setLocalText] = useState('')
  const InputComponent = multiline ? 'textarea' : 'input'

  const handleVoiceResult = useCallback((text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    if (mode === 'append') {
      const separator = value.trim() ? ' ' : ''
      onChange(value + separator + trimmed)
    } else {
      onChange(trimmed)
    }
  }, [value, onChange, mode])

  return (
    <div className={`flex items-start gap-2 ${className}`}>
      <div className="flex-1">
        {multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`vl-input text-sm min-h-[80px] w-full resize-none ${inputClassName}`}
            maxLength={2000}
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`vl-input text-sm min-h-[36px] w-full ${inputClassName}`}
          />
        )}
      </div>
      <VoiceInputButton
        lang={lang}
        listeningLang={listeningLang}
        onResult={handleVoiceResult}
        compact
      />
    </div>
  )
}
