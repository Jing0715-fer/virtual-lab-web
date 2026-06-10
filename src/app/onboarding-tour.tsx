'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, ChevronRight, ChevronLeft, FlaskConical, LayoutDashboard, Bot, Users, Kanban, Dna, Sparkles, Keyboard, ArrowRight } from 'lucide-react'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

// ============================================================
// Constants
// ============================================================

const STORAGE_KEY = 'vl-onboarding-completed'

export interface TourStep {
  id: string
  titleKey: string
  descKey: string
  icon: React.ElementType
  targetSelector?: string
  iconColor: string
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    titleKey: 'onboarding.welcome.title',
    descKey: 'onboarding.welcome.desc',
    icon: FlaskConical,
    iconColor: 'text-emerald-400',
  },
  {
    id: 'dashboard',
    titleKey: 'onboarding.dashboard.title',
    descKey: 'onboarding.dashboard.desc',
    icon: LayoutDashboard,
    iconColor: 'text-blue-400',
    targetSelector: '[data-tour="dashboard"]',
  },
  {
    id: 'agents',
    titleKey: 'onboarding.agents.title',
    descKey: 'onboarding.agents.desc',
    icon: Bot,
    iconColor: 'text-amber-400',
    targetSelector: '[data-tour="agents"]',
  },
  {
    id: 'meetings',
    titleKey: 'onboarding.meetings.title',
    descKey: 'onboarding.meetings.desc',
    icon: Users,
    iconColor: 'text-cyan-400',
    targetSelector: '[data-tour="meetings"]',
  },
  {
    id: 'pipeline',
    titleKey: 'onboarding.pipeline.title',
    descKey: 'onboarding.pipeline.desc',
    icon: Kanban,
    iconColor: 'text-violet-400',
    targetSelector: '[data-tour="pipeline"]',
  },
  {
    id: 'bioTools',
    titleKey: 'onboarding.bioTools.title',
    descKey: 'onboarding.bioTools.desc',
    icon: Dna,
    iconColor: 'text-rose-400',
    targetSelector: '[data-tour="bio-tools"]',
  },
  {
    id: 'shortcuts',
    titleKey: 'onboarding.shortcuts.title',
    descKey: 'onboarding.shortcuts.desc',
    icon: Keyboard,
    iconColor: 'text-orange-400',
    targetSelector: '[data-tour="shortcuts"]',
  },
  {
    id: 'complete',
    titleKey: 'onboarding.complete.title',
    descKey: 'onboarding.complete.desc',
    icon: Sparkles,
    iconColor: 'text-yellow-400',
  },
]

// ============================================================
// useOnboardingTour Hook
// ============================================================

export function useOnboardingTour() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('vl-lang') as Lang) || 'en'
    }
    return 'en'
  })

  useEffect(() => {
    const saved = localStorage.getItem('vl-lang')
    if (saved === 'en' || saved === 'zh') {
      queueMicrotask(() => setLang(saved))
    }
  }, [])

  const totalSteps = TOUR_STEPS.length

  const completeTour = useCallback(() => {
    if (dontShowAgain) {
      localStorage.setItem(STORAGE_KEY, 'true')
    }
    setIsOpen(false)
    setIsCompleted(true)
  }, [dontShowAgain])

  const skipTour = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setIsOpen(false)
    setIsCompleted(true)
  }, [])

  const nextStep = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      completeTour()
    }
  }, [currentStep, totalSteps, completeTour])

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }, [currentStep])

  const resetTour = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setIsCompleted(false)
    setCurrentStep(0)
    setIsOpen(true)
  }, [])

  return {
    isOpen,
    setIsOpen,
    currentStep,
    totalSteps,
    dontShowAgain,
    setDontShowAgain,
    isCompleted,
    lang,
    nextStep,
    prevStep,
    skipTour,
    completeTour,
    resetTour,
    step: TOUR_STEPS[currentStep],
  }
}

// ============================================================
// useFocusTrap Hook — Traps keyboard focus within a container
// ============================================================

export function useFocusTrap(containerRef: React.RefObject<HTMLElement | null>, isActive: boolean) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return

    const container = containerRef.current
    const focusableSelector = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      const focusable = Array.from(container.querySelectorAll<HTMLElement>(focusableSelector))
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    // Auto-focus the first focusable element
    const focusable = container.querySelector<HTMLElement>(focusableSelector)
    focusable?.focus()

    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isActive, containerRef])
}

// ============================================================
// WelcomeSplashScreen Component
// ============================================================

export function WelcomeSplashScreen({ onComplete }: { onComplete: () => void }) {
  const [mounted, setMounted] = useState(false)
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('vl-lang') as Lang) || 'en'
    }
    return 'en'
  })

  useEffect(() => {
    const saved = localStorage.getItem('vl-lang')
    if (saved === 'en' || saved === 'zh') {
      queueMicrotask(() => setLang(saved))
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => setMounted(true))
  }, [])

  // Check if splash was already shown
  const [alreadyCompleted, setAlreadyCompleted] = useState(false)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const completed = localStorage.getItem(STORAGE_KEY)
      if (completed) {
        queueMicrotask(() => setAlreadyCompleted(true))
      }
    }
  }, [])

  const handleGetStarted = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true')
    onComplete()
  }, [onComplete])

  const handleSkip = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true')
    onComplete()
  }, [onComplete])

  // Don't render on server or if already completed
  if (!mounted || alreadyCompleted) return null

  const features = [
    {
      icon: Bot,
      color: 'bg-amber-500/15 text-amber-500',
      title: t(lang, 'onboarding.splash.feature1.title'),
      desc: t(lang, 'onboarding.splash.feature1.desc'),
    },
    {
      icon: Users,
      color: 'bg-cyan-500/15 text-cyan-500',
      title: t(lang, 'onboarding.splash.feature2.title'),
      desc: t(lang, 'onboarding.splash.feature2.desc'),
    },
    {
      icon: Kanban,
      color: 'bg-violet-500/15 text-violet-500',
      title: t(lang, 'onboarding.splash.feature3.title'),
      desc: t(lang, 'onboarding.splash.feature3.desc'),
    },
  ]

  return (
    <div
      className="tour-splash"
      role="dialog"
      aria-modal="true"
      aria-label={t(lang, 'onboarding.welcome.title')}
    >
      {/* Decorative gradient blobs */}
      <div className="absolute top-20 left-1/4 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" aria-hidden="true" />
      <div className="absolute bottom-20 right-1/4 w-48 h-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" aria-hidden="true" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-lg">
        {/* Animated logo */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
          className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center mb-8 shadow-lg shadow-emerald-500/25"
        >
          <FlaskConical className="size-10 text-white" />
        </motion.div>

        {/* App name */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-3xl sm:text-4xl font-bold mb-3 gradient-text"
        >
          Virtual Lab
        </motion.h1>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-base vl-text-body mb-10"
        >
          {t(lang, 'onboarding.splash.tagline')}
        </motion.p>

        {/* Feature highlights */}
        <div className="w-full space-y-3 mb-10">
          {features.map((feature) => {
            const FeatureIcon = feature.icon
            return (
              <div
                key={feature.title}
                className="tour-splash-feature vl-card rounded-xl border p-4 flex items-center gap-4 text-left hover:border-emerald-500/30 transition-colors"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${feature.color}`}>
                  <FeatureIcon className="size-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold vl-text-heading">{feature.title}</h3>
                  <p className="text-xs vl-text-muted mt-0.5 leading-relaxed">{feature.desc}</p>
                </div>
                <ArrowRight className="size-4 vl-text-muted shrink-0 ml-auto" aria-hidden="true" />
              </div>
            )
          })}
        </div>

        {/* Get Started button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="w-full"
        >
          <button
            onClick={handleGetStarted}
            className="tour-get-started-btn w-full py-3.5 px-6 rounded-xl text-base font-semibold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 shadow-lg shadow-emerald-500/25 transition-colors"
          >
            {t(lang, 'onboarding.splash.getStarted')}
          </button>

          {/* Skip link */}
          <button
            onClick={handleSkip}
            className="mt-4 text-sm vl-text-muted hover:vl-text-body transition-colors focus-ring rounded px-3 py-1"
          >
            {t(lang, 'onboarding.splash.skipToApp')}
          </button>
        </motion.div>
      </div>
    </div>
  )
}

// ============================================================
// OnboardingOverlay Component (Enhanced)
// ============================================================

export function OnboardingOverlay() {
  const {
    isOpen,
    setIsOpen,
    currentStep,
    totalSteps,
    dontShowAgain,
    setDontShowAgain,
    lang,
    nextStep,
    prevStep,
    skipTour,
    step,
  } = useOnboardingTour()

  const cardRef = useRef<HTMLDivElement>(null)

  // Focus trap
  useFocusTrap(cardRef, isOpen)

  // Show tour on mount if not completed
  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY)
    if (!completed) {
      const timer = setTimeout(() => {
        setIsOpen(true)
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [setIsOpen])

  // Keyboard navigation: arrow keys, Escape
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input
      const active = document.activeElement
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || (active as HTMLElement).isContentEditable)) return

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        nextStep()
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        prevStep()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        skipTour()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, nextStep, prevStep, skipTour])

  if (!isOpen || !step) return null

  const StepIcon = step.icon
  const isLastStep = currentStep === totalSteps - 1
  const isFirstStep = currentStep === 0

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[60] pointer-events-auto"
        role="dialog"
        aria-modal="true"
        aria-label={t(lang, 'onboarding.welcome.title')}
      >
        {/* Semi-transparent backdrop with spotlight effect */}
        <div className="tour-spotlight" onClick={skipTour} />

        {/* Centered content card */}
        <div className="relative z-[81] flex items-center justify-center min-h-screen p-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              ref={cardRef}
              className="w-full max-w-md focus-trap"
            >
              <div className="vl-card rounded-2xl border border-[var(--vl-border)] shadow-2xl overflow-hidden elevated-layer">
                {/* Hero / Icon area */}
                <div className="relative p-8 pb-4 text-center">
                  {/* Decorative gradient blob */}
                  <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full blur-3xl opacity-20"
                    style={{
                      background: step.id === 'welcome'
                        ? 'linear-gradient(135deg, #10b981, #06b6d4)'
                        : step.id === 'dashboard'
                        ? 'linear-gradient(135deg, #10b981, #059669)'
                        : step.id === 'agents'
                        ? 'linear-gradient(135deg, #f59e0b, #ef4444)'
                        : step.id === 'meetings'
                        ? 'linear-gradient(135deg, #06b6d4, #10b981)'
                        : step.id === 'pipeline'
                        ? 'linear-gradient(135deg, #8b5cf6, #ec4899)'
                        : step.id === 'bioTools'
                        ? 'linear-gradient(135deg, #f43f5e, #ec4899)'
                        : step.id === 'shortcuts'
                        ? 'linear-gradient(135deg, #f97316, #eab308)'
                        : 'linear-gradient(135deg, #eab308, #f97316)',
                    }}
                    aria-hidden="true"
                  />

                  {/* Step counter badge */}
                  <div className="absolute top-4 right-4 tour-step-badge">
                    {t(lang, 'onboarding.tour.stepCounter').replace('{current}', String(currentStep + 1)).replace('{total}', String(totalSteps))}
                  </div>

                  {/* Progress dots */}
                  <div className="tour-progress-dots mb-6 relative z-10" role="group" aria-label="Tour progress">
                    {TOUR_STEPS.map((s, i) => (
                      <div
                        key={s.id}
                        className={`dot ${i === currentStep ? 'active' : i < currentStep ? 'completed' : ''}`}
                        aria-hidden="true"
                      />
                    ))}
                  </div>

                  {/* Icon */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                    className={`w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4 relative z-10`}
                  >
                    <StepIcon className={`size-8 ${step.iconColor}`} />
                  </motion.div>

                  {/* Title */}
                  <h2
                    className="text-xl font-bold mb-2 relative z-10"
                    style={{ color: 'var(--vl-text-white)' }}
                  >
                    {t(lang, step.titleKey)}
                  </h2>

                  {/* Description */}
                  <p className="text-sm vl-text-body relative z-10 leading-relaxed max-w-sm mx-auto">
                    {t(lang, step.descKey)}
                  </p>
                </div>

                {/* Navigation */}
                <div className="px-8 pb-8 pt-2">
                  {/* Don't show again checkbox */}
                  <label className="flex items-center gap-2 mb-4 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={dontShowAgain}
                      onChange={(e) => setDontShowAgain(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-[var(--vl-border)] bg-transparent accent-emerald-500 cursor-pointer"
                    />
                    <span className="text-[11px] vl-text-muted group-hover:vl-text-body transition-colors">
                      {t(lang, 'onboarding.dontShowAgain')}
                    </span>
                  </label>

                  {/* Buttons */}
                  <div className="flex items-center gap-3">
                    {!isFirstStep && (
                      <button
                        onClick={prevStep}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium vl-text-muted hover:vl-text-body transition-colors border border-[var(--vl-border)] hover:border-[var(--vl-border-strong)]"
                        aria-label={t(lang, 'onboarding.tour.back')}
                      >
                        <ChevronLeft className="size-4" />
                        {t(lang, 'onboarding.tour.back')}
                      </button>
                    )}

                    <button
                      onClick={nextStep}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-200 ${
                        isLastStep
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 shadow-lg shadow-emerald-500/25'
                          : 'bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/20'
                      }`}
                    >
                      {isLastStep ? (
                        <>
                          <CheckCircle2 className="size-4" />
                          {t(lang, 'onboarding.tour.finish')}
                        </>
                      ) : (
                        <>
                          {t(lang, 'onboarding.tour.next')}
                          <ChevronRight className="size-4" />
                        </>
                      )}
                    </button>
                  </div>

                  {/* Skip link */}
                  {!isLastStep && (
                    <button
                      onClick={skipTour}
                      className="w-full text-center mt-3 text-xs vl-text-muted hover:vl-text-body transition-colors"
                    >
                      {t(lang, 'onboarding.skip')}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
