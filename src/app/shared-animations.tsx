'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Bot, Target, Play, ArrowRight, Dna,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { NANOBODY_WORKFLOW_STEPS } from './shared-types'

// ============================================================
// TiltCard — 3D hover effect wrapper
// ============================================================

export function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const cardRef = React.useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [glowPos, setGlowPos] = useState({ x: 50, y: 50 })

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    setTilt({ x: (y - 0.5) * -8, y: (x - 0.5) * 8 })
    setGlowPos({ x: x * 100, y: y * 100 })
  }

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 })
  }

  return (
    <div
      ref={cardRef}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transition: 'transform 0.15s ease-out',
        position: 'relative',
      }}
    >
      {tilt.x !== 0 || tilt.y !== 0 ? (
        <div
          className="absolute inset-0 pointer-events-none rounded-lg z-50"
          style={{
            background: `radial-gradient(circle at ${glowPos.x}% ${glowPos.y}%, rgba(16,185,129,0.08) 0%, transparent 60%)`,
          }}
        />
      ) : null}
      {children}
    </div>
  )
}

// ============================================================
// Scroll Progress Indicator
// ============================================================

export function ScrollProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      setProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-[2px]" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
      <motion.div
        className="h-full bg-emerald-500"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.1, ease: 'linear' }}
      />
    </div>
  )
}

// ============================================================
// DNA Helix Background (SVG animation)
// ============================================================

export function DNAHelixBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 1 }}>
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 800 280">
        <defs>
          <linearGradient id="dna-grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#10b981', stopOpacity: 0.3 }} />
            <stop offset="100%" style={{ stopColor: '#06b6d4', stopOpacity: 0.1 }} />
          </linearGradient>
          <linearGradient id="dna-grad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#8b5cf6', stopOpacity: 0.2 }} />
            <stop offset="100%" style={{ stopColor: '#10b981', stopOpacity: 0.1 }} />
          </linearGradient>
        </defs>
        {/* Left DNA strand */}
        <path d="M0,140 C50,60 100,60 150,140 C200,220 250,220 300,140 C350,60 400,60 450,140 C500,220 550,220 600,140 C650,60 700,60 750,140" fill="none" stroke="url(#dna-grad1)" strokeWidth="2">
          <animateTransform attributeName="transform" type="translate" values="0,0;0,-10;0,0" dur="6s" repeatCount="indefinite" />
        </path>
        {/* Right DNA strand */}
        <path d="M0,140 C50,220 100,220 150,140 C200,60 250,60 300,140 C350,220 400,220 450,140 C500,60 550,60 600,140 C650,220 700,220 750,140" fill="none" stroke="url(#dna-grad2)" strokeWidth="2">
          <animateTransform attributeName="transform" type="translate" values="0,0;0,10;0,0" dur="6s" repeatCount="indefinite" />
        </path>
        {/* Cross bars (rungs) */}
        {[75, 225, 375, 525, 675].map((x, i) => (
          <g key={i}>
            <line x1={x} y1={100 + Math.sin(i * 1.2) * 40} x2={x} y2={180 - Math.sin(i * 1.2) * 40} stroke="#10b981" strokeOpacity="0.15" strokeWidth="1">
              <animateTransform attributeName="transform" type="translate" values="0,0;0,-5;0,0" dur="6s" begin={`${i * 0.3}s`} repeatCount="indefinite" />
            </line>
          </g>
        ))}
        {/* Floating molecules */}
        {[
          { cx: 100, cy: 60, r: 3, delay: 0 },
          { cx: 300, cy: 40, r: 2, delay: 1 },
          { cx: 500, cy: 230, r: 2.5, delay: 2 },
          { cx: 700, cy: 50, r: 2, delay: 0.5 },
          { cx: 200, cy: 240, r: 3, delay: 1.5 },
          { cx: 600, cy: 60, r: 2, delay: 3 },
        ].map((mol, i) => (
          <circle key={i} cx={mol.cx} cy={mol.cy} r={mol.r} fill="#10b981" fillOpacity="0.35">
            <animate attributeName="cy" values={`${mol.cy};${mol.cy - 15};${mol.cy}`} dur={`${4 + i}s`} begin={`${mol.delay}s`} repeatCount="indefinite" />
            <animate attributeName="fillOpacity" values="0.35;0.6;0.35" dur={`${4 + i}s`} begin={`${mol.delay}s`} repeatCount="indefinite" />
          </circle>
        ))}
        {/* Hexagonal molecule shapes */}
        {[{ cx: 150, cy: 200 }, { cx: 650, cy: 80 }].map((pos, i) => (
          <g key={i}>
            {Array.from({ length: 6 }).map((_, j) => {
              const angle = (Math.PI * 2 * j) / 6 - Math.PI / 2
              const nx = pos.cx + 12 * Math.cos(angle)
              const ny = pos.cy + 12 * Math.sin(angle)
              const nAngle = (Math.PI * 2 * ((j + 1) % 6)) / 6 - Math.PI / 2
              const nnx = pos.cx + 12 * Math.cos(nAngle)
              const nny = pos.cy + 12 * Math.sin(nAngle)
              return <line key={j} x1={nx} y1={ny} x2={nnx} y2={nny} stroke="#06b6d4" strokeOpacity="0.2" strokeWidth="1" />
            })}
            <animateTransform attributeName="transform" type="rotate" values={`0 ${pos.cx} ${pos.cy};360 ${pos.cx} ${pos.cy}`} dur="20s" repeatCount="indefinite" />
          </g>
        ))}
      </svg>
    </div>
  )
}

// ============================================================
// How It Works Section
// ============================================================

export function HowItWorksSection() {
  const steps = [
    { num: '01', title: 'Create Agents', desc: 'Define AI agents with specialized expertise, goals, and roles for your research team.', icon: Bot, color: '#f59e0b' },
    { num: '02', title: 'Set Agenda', desc: 'Configure meeting parameters, questions, and rules to guide the discussion.', icon: Target, color: '#10b981' },
    { num: '03', title: 'Run Meeting', desc: 'Launch team or individual meetings and watch AI agents collaborate in real-time.', icon: Play, color: '#06b6d4' },
  ]

  return (
    <Card className="vl-card backdrop-blur-sm transition-all duration-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-semibold tracking-tight" style={{ color: 'var(--vl-text-white)' }}>How It Works</CardTitle>
        <CardDescription className="text-sm vl-text-body">Three steps to AI-powered research</CardDescription>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15 }}
              className="relative group"
            >
              <div className="flex flex-col items-center text-center gap-3 p-6 rounded-xl vl-inner border hover:border-[var(--vl-border-subtle)] transition-all duration-300 hover:shadow-[0_0_20px_rgba(16,185,129,0.08)] hover:-translate-y-1">
                {/* Step number with gradient circle */}
                <div className="relative">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${step.color}33, ${step.color}11)`,
                      boxShadow: `0 0 25px ${step.color}20`,
                    }}
                  >
                    <step.icon className="size-7" style={{ color: step.color }} />
                  </div>
                  <span
                    className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                    style={{
                      background: `linear-gradient(135deg, ${step.color}, ${step.color}99)`,
                      boxShadow: `0 0 10px ${step.color}40`,
                    }}
                  >
                    {step.num}
                  </span>
                </div>
                <div>
                  <p className="text-base font-medium tracking-tight mb-1 gradient-text-animate" style={{ color: 'var(--vl-text-white)' }}>{step.title}</p>
                  <p className="text-sm vl-text-muted leading-relaxed">{step.desc}</p>
                </div>
              </div>
              {/* Connecting arrow */}
              {i < steps.length - 1 && (
                <div className="hidden sm:flex absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 z-10">
                  <div className="flex items-center">
                    <div className="w-8 h-px" style={{ background: `linear-gradient(to right, ${step.color}40, ${steps[i + 1].color}40)` }} />
                    <ArrowRight className="size-4 -ml-1" style={{ color: steps[i + 1].color + '60' }} />
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Nanobody Workflow Section
// ============================================================

export function NanobodyWorkflowSection() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="vl-card backdrop-blur-sm transition-all duration-200">
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-[var(--vl-bg-inner)] transition-colors rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Dna className="size-4 text-emerald-400" />
                <CardTitle className="text-base" style={{ color: 'var(--vl-text-white)' }}>Nanobody Design Workflow</CardTitle>
              </div>
              <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <svg className="size-4 vl-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
              </motion.div>
            </div>
            <CardDescription className="vl-text-muted text-xs">Computational pipeline for SARS-CoV-2 nanobody design</CardDescription>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="flex flex-col sm:flex-row items-stretch gap-2 sm:gap-0 overflow-x-auto pb-2">
              {NANOBODY_WORKFLOW_STEPS.map((step, i) => (
                <React.Fragment key={step.name}>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl vl-inner border min-w-[120px] sm:min-w-0 sm:flex-1 hover:border-[var(--vl-border-subtle)] transition-colors"
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${step.color}20` }}
                    >
                      <step.icon className="size-5" style={{ color: step.color }} />
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[10px] border-0 font-medium text-white"
                      style={{ backgroundColor: `${step.color}99` }}
                    >
                      {step.name}
                    </Badge>
                    <p className="text-[10px] vl-text-muted text-center leading-tight">{step.description}</p>
                  </motion.div>
                  {i < NANOBODY_WORKFLOW_STEPS.length - 1 && (
                    <div className="hidden sm:flex items-center px-1 shrink-0">
                      <ArrowRight className="size-3.5 vl-text-muted" />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
