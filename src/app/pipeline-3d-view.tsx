'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  RotateCcw, ZoomIn, ZoomOut, Maximize2, Minimize2,
  Box, ChevronRight, CheckCircle2, CircleDot,
  Play, Pause, Eye, Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import type { PipelineStageData } from './shared-components'

// ============================================================
// Types
// ============================================================

interface Stage3DCard {
  id: string
  title: string
  taskCount: number
  completedCount: number
  completionPct: number
  color: string
  index: number
}

interface Particle {
  id: number
  x: number
  y: number
  progress: number
  speed: number
  color: string
  size: number
}

// ============================================================
// Pipeline3DView Component
// ============================================================

export function Pipeline3DView({
  stages,
  lang,
}: {
  stages: PipelineStageData[]
  lang: Lang
}) {
  const [autoRotate, setAutoRotate] = useState(false)
  const [rotateAngle, setRotateAngle] = useState(-15)
  const [zoomedStage, setZoomedStage] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [particles, setParticles] = useState<Particle[]>([])
  const [mounted, setMounted] = useState(false)
  const animFrameRef = useRef<number>(0)
  const particleIdRef = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Hydration-safe mount
  useEffect(() => {
    requestAnimationFrame(() => {
      setMounted(true)
      const mql = window.matchMedia('(max-width: 768px)')
      setIsMobile(mql.matches)
      const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
      mql.addEventListener('change', handler)
      return () => mql.removeEventListener('change', handler)
    })
  }, [])

  // Build stage card data
  const stageCards: Stage3DCard[] = useMemo(() => {
    return stages.map((stage, idx) => {
      const total = stage.tasks.length
      const completed = stage.tasks.filter(t => t.status === 'done').length
      return {
        id: stage.id,
        title: stage.title,
        taskCount: total,
        completedCount: completed,
        completionPct: total > 0 ? Math.round((completed / total) * 100) : 0,
        color: stage.color,
        index: idx,
      }
    })
  }, [stages])

  // Auto-rotate animation loop
  useEffect(() => {
    if (!autoRotate || isMobile) return
    let lastTime = 0
    const animate = (time: number) => {
      if (lastTime) {
        const delta = time - lastTime
        setRotateAngle(prev => (prev + delta * 0.015) % 360)
      }
      lastTime = time
      animFrameRef.current = requestAnimationFrame(animate)
    }
    animFrameRef.current = requestAnimationFrame(animate)
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [autoRotate, isMobile])

  // Particle system for connections
  useEffect(() => {
    if (!mounted || stageCards.length < 2 || isMobile) return
    const spawnInterval = setInterval(() => {
      setParticles(prev => {
        const filtered = prev.filter(p => p.progress < 1)
        if (filtered.length > 20) return filtered
        const connIdx = Math.floor(Math.random() * (stageCards.length - 1))
        const fromCard = stageCards[connIdx]
        const toCard = stageCards[connIdx + 1]
        const newParticle: Particle = {
          id: particleIdRef.current++,
          x: 0,
          y: 0,
          progress: 0,
          speed: 0.003 + Math.random() * 0.005,
          color: fromCard.color,
          size: 2 + Math.random() * 3,
        }
        return [...filtered, newParticle]
      })
    }, 300)
    return () => clearInterval(spawnInterval)
  }, [mounted, stageCards, isMobile])

  // Animate particles
  useEffect(() => {
    if (isMobile) return
    const animateParticles = () => {
      setParticles(prev => {
        const updated = prev.map(p => ({
          ...p,
          progress: p.progress + p.speed,
        })).filter(p => p.progress < 1)
        return updated.length > 0 ? updated : prev
      })
    }
    const interval = setInterval(animateParticles, 16)
    return () => clearInterval(interval)
  }, [isMobile])

  const handleCardClick = useCallback((stageId: string) => {
    requestAnimationFrame(() => {
      setZoomedStage(prev => prev === stageId ? null : stageId)
    })
  }, [])

  const handleResetView = useCallback(() => {
    requestAnimationFrame(() => {
      setAutoRotate(false)
      setRotateAngle(-15)
      setZoomedStage(null)
    })
  }, [])

  // ========== Desktop: 3D Perspective View ==========
  const totalStages = stageCards.length
  const arcRadius = Math.max(300, totalStages * 80)
  const perspective = 1200

  // Calculate card positions along a curved path
  const cardPositions = useMemo(() => {
    const angleSpan = Math.min(totalStages * 25, 160)
    const startAngle = -angleSpan / 2
    const endAngle = angleSpan / 2

    return stageCards.map((card, idx) => {
      const angleFraction = totalStages === 1 ? 0 : idx / (totalStages - 1)
      const angle = startAngle + angleFraction * (endAngle - startAngle)
      const radians = (angle * Math.PI) / 180
      const x = Math.sin(radians) * arcRadius
      const z = Math.cos(radians) * arcRadius - arcRadius
      const rotateY = -angle
      return { x, z, rotateY, angle, card }
    })
  }, [stageCards, totalStages, arcRadius])

  // Calculate SVG connection line positions
  const connectionLines = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number; color: string; index: number }[] = []
    for (let i = 0; i < cardPositions.length - 1; i++) {
      const from = cardPositions[i]
      const to = cardPositions[i + 1]
      lines.push({
        x1: 50 + (i / totalStages) * 100,
        y1: 30,
        x2: 50 + ((i + 1) / totalStages) * 100,
        y2: 30,
        color: from.card.color,
        index: i,
      })
    }
    return lines
  }, [cardPositions, totalStages])

  if (!mounted) {
    return (
      <div className="space-y-4 p-6">
        <div className="skeleton-shimmer-enhanced h-8 w-64 rounded-lg" />
        <div className="flex gap-4 overflow-x-auto">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton-shimmer-enhanced h-48 w-40 rounded-xl flex-shrink-0" />
          ))}
        </div>
      </div>
    )
  }

  if (stageCards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Box className="size-12 vl-text-muted mb-3 vl-float-animation" />
        <p className="text-sm vl-text-muted">{t(lang, 'pipeline.noPipelineSelectedDesc')}</p>
      </div>
    )
  }

  // ========== Mobile: Flat list fallback ==========
  if (isMobile) {
    return (
      <div className="space-y-4 p-2">
        {/* Header */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <Box className="size-4 text-emerald-500" />
            <h3 className="text-sm font-semibold vl-text-heading">{t(lang, 'pipeline.3d.title')}</h3>
          </div>
          <p className="text-[10px] vl-text-muted">{t(lang, 'pipeline.3d.description')}</p>
        </div>

        {/* Flat stage list */}
        <div className="space-y-2">
          {stageCards.map((card, idx) => {
            const isZoomed = zoomedStage === card.id
            return (
              <motion.button
                key={card.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.06 }}
                onClick={() => handleCardClick(card.id)}
                className="w-full text-left vl-card border rounded-xl overflow-hidden transition-all duration-300"
                style={{
                  borderColor: isZoomed ? `${card.color}60` : undefined,
                  boxShadow: isZoomed ? `0 0 20px ${card.color}15` : undefined,
                }}
              >
                <div className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: card.color }}
                    />
                    <h4 className="text-sm font-medium vl-text-heading flex-1 truncate">{card.title}</h4>
                    {idx < stageCards.length - 1 && (
                      <ChevronRight className="size-3.5 vl-text-muted flex-shrink-0" />
                    )}
                  </div>
                  {isZoomed && (
                    <AnimatePresence>
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2 pt-2 border-t border-[var(--vl-border-subtle)]"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="vl-text-muted">{t(lang, 'pipeline.3d.tasks')}: {card.taskCount}</span>
                          <span className="vl-text-muted">{t(lang, 'pipeline.3d.completed')}: {card.completedCount}</span>
                        </div>
                        <div className="h-2 rounded-full bg-[var(--vl-bg-inner)] overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: card.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${card.completionPct}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                          />
                        </div>
                        <span className="text-xs font-medium" style={{ color: card.color }}>
                          {card.completionPct}%
                        </span>
                      </motion.div>
                    </AnimatePresence>
                  )}
                  {!isZoomed && (
                    <div className="flex items-center gap-2 text-[10px] vl-text-muted">
                      <span>{card.taskCount} {t(lang, 'pipeline.3d.tasks')}</span>
                      <span>·</span>
                      <span>{card.completionPct}%</span>
                    </div>
                  )}
                </div>
              </motion.button>
            )
          })}
        </div>
      </div>
    )
  }

  // ========== Desktop: 3D Perspective View ==========
  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Box className="size-4 text-emerald-500" />
          <h3 className="text-sm font-semibold vl-text-heading">{t(lang, 'pipeline.3d.title')}</h3>
          <p className="text-[10px] vl-text-muted hidden sm:inline">{t(lang, 'pipeline.3d.description')}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs vl-text-muted hover:text-emerald-400"
            onClick={() => requestAnimationFrame(() => setAutoRotate(prev => !prev))}
          >
            {autoRotate ? <Pause className="size-3" /> : <Play className="size-3" />}
            <span className="ml-1 hidden sm:inline">{t(lang, 'pipeline.3d.autoRotate')}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs vl-text-muted hover:text-emerald-400"
            onClick={handleResetView}
          >
            <RotateCcw className="size-3" />
            <span className="ml-1 hidden sm:inline">{t(lang, 'pipeline.3d.resetView')}</span>
          </Button>
        </div>
      </div>

      {/* 3D Scene Container */}
      <div
        ref={containerRef}
        className="relative rounded-xl overflow-hidden vl-card border"
        style={{
          perspective: `${perspective}px`,
          minHeight: 380,
        }}
      >
        {/* Background gradient */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 50% 40%, rgba(16,185,129,0.04) 0%, transparent 70%)',
          }}
        />

        {/* 3D Stage */}
        <div
          className="relative w-full h-full"
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotateX(8deg) rotateY(${rotateAngle}deg)`,
            transition: autoRotate ? 'none' : 'transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)',
            minHeight: 350,
          }}
        >
          <div className="relative flex items-center justify-center" style={{ minHeight: 350 }}>
            {/* SVG Connection Lines + Particles Overlay */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 100 60"
              preserveAspectRatio="none"
            >
              <defs>
                {connectionLines.map((line, i) => (
                  <linearGradient key={`conn-grad-${i}`} id={`conn-grad-${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={line.color} stopOpacity={0.5} />
                    <stop offset="100%" stopColor={cardPositions[Math.min(line.index + 1, cardPositions.length - 1)]?.card.color || line.color} stopOpacity={0.5} />
                  </linearGradient>
                ))}
                <filter id="particle-glow">
                  <feGaussianBlur stdDeviation="0.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {/* Connection lines */}
              {connectionLines.map((line, i) => {
                const midX = (line.x1 + line.x2) / 2
                const midY = line.y1 - 3
                return (
                  <path
                    key={`line-${i}`}
                    d={`M ${line.x1} ${line.y1} Q ${midX} ${midY} ${line.x2} ${line.y2}`}
                    fill="none"
                    stroke={`url(#conn-grad-${i})`}
                    strokeWidth={0.3}
                    strokeDasharray="1 0.5"
                    opacity={0.6}
                    className="pipeline-3d-connection"
                  />
                )
              })}
              {/* Animated particles along connections */}
              {particles.map((particle) => {
                const connIdx = Math.floor(particle.progress * (connectionLines.length - 1))
                const conn = connectionLines[Math.min(connIdx, connectionLines.length - 1)]
                if (!conn) return null
                const localProgress = particle.progress * (connectionLines.length - 1) - connIdx
                const x = conn.x1 + (conn.x2 - conn.x1) * localProgress
                const midX = (conn.x1 + conn.x2) / 2
                const midY = conn.y1 - 3
                const y = conn.y1 + (midY - conn.y1) * 2 * localProgress * (1 - localProgress) + (conn.y2 - midY) * localProgress * localProgress
                return (
                  <circle
                    key={particle.id}
                    cx={x}
                    cy={y}
                    r={particle.size * 0.15}
                    fill={particle.color}
                    opacity={0.8 * (1 - particle.progress * 0.5)}
                    filter="url(#particle-glow)"
                    className="pipeline-particle-dot"
                  />
                )
              })}
            </svg>

            {/* 3D Cards */}
            {cardPositions.map(({ x, z, rotateY, card }, idx) => {
              const isZoomed = zoomedStage === card.id
              const scale = isZoomed ? 1.15 : 1
              const translateZ = isZoomed ? z + 60 : z

              return (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08, duration: 0.4 }}
                  className="absolute cursor-pointer"
                  style={{
                    width: 160,
                    left: '50%',
                    top: '50%',
                    marginTop: -80,
                    marginLeft: -80,
                    transform: `translateX(${x * 0.5}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                    transition: isZoomed
                      ? 'transform 0.4s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.3s ease'
                      : 'transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)',
                    transformStyle: 'preserve-3d',
                    zIndex: isZoomed ? 20 : 10 - idx,
                  }}
                  onClick={() => handleCardClick(card.id)}
                  role="button"
                  tabIndex={0}
                  aria-label={`${card.title}: ${card.completionPct}% complete`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') handleCardClick(card.id)
                  }}
                >
                  <div
                    className="rounded-xl border p-3 backdrop-blur-md pipeline-3d-float"
                    style={{
                      backgroundColor: isZoomed
                        ? `rgba(255, 255, 255, 0.12)`
                        : 'rgba(255, 255, 255, 0.06)',
                      borderColor: isZoomed
                        ? `${card.color}50`
                        : 'rgba(255, 255, 255, 0.1)',
                      boxShadow: isZoomed
                        ? `0 0 30px ${card.color}20, 0 8px 32px rgba(0,0,0,0.15)`
                        : `0 4px 16px rgba(0,0,0,0.1)`,
                      animationDelay: `${idx * 0.2}s`,
                    }}
                  >
                    {/* Top accent line */}
                    <div
                      className="absolute top-0 left-2 right-2 h-0.5 rounded-full"
                      style={{ backgroundColor: card.color }}
                    />

                    {/* Stage number */}
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                        style={{
                          backgroundColor: `${card.color}20`,
                          color: card.color,
                        }}
                      >
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      {card.completionPct === 100 && (
                        <CheckCircle2 className="size-3.5" style={{ color: card.color }} />
                      )}
                    </div>

                    {/* Title */}
                    <h4
                      className="text-xs font-semibold mb-1.5 line-clamp-2"
                      style={{ color: 'var(--vl-text-heading)' }}
                    >
                      {card.title}
                    </h4>

                    {/* Task count */}
                    <div className="flex items-center gap-1.5 text-[10px] vl-text-muted mb-2">
                      <CircleDot className="size-2.5" />
                      <span>{card.taskCount} {t(lang, 'pipeline.3d.tasks')}</span>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[9px]">
                        <span className="vl-text-muted">{t(lang, 'pipeline.3d.completed')}</span>
                        <span className="font-bold" style={{ color: card.color }}>{card.completionPct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--vl-bg-inner)' }}>
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: card.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${card.completionPct}%` }}
                          transition={{ duration: 0.8, delay: idx * 0.1, ease: 'easeOut' }}
                        />
                      </div>
                    </div>

                    {/* Zoomed detail */}
                    <AnimatePresence>
                      {isZoomed && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, marginTop: 0 }}
                          animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                          exit={{ opacity: 0, height: 0, marginTop: 0 }}
                          className="overflow-hidden border-t pt-2 mt-2"
                          style={{ borderColor: 'var(--vl-border-subtle)' }}
                        >
                          <div className="flex items-center gap-1.5 text-[9px] vl-text-muted">
                            <Eye className="size-2.5" />
                            <span>{t(lang, 'pipeline.3d.clickToZoom')}</span>
                          </div>
                          {/* Task breakdown mini list */}
                          <div className="mt-1.5 space-y-0.5">
                            {stages[idx].tasks.slice(0, 3).map(task => (
                              <div key={task.id} className="flex items-center gap-1 text-[9px] vl-text-muted">
                                <div
                                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                  style={{
                                    backgroundColor: task.status === 'done' ? card.color : 'var(--vl-text-muted)',
                                    opacity: task.status === 'done' ? 1 : 0.3,
                                  }}
                                />
                                <span className="truncate">{task.title}</span>
                              </div>
                            ))}
                            {stages[idx].tasks.length > 3 && (
                              <span className="text-[8px] vl-text-muted pl-2.5">
                                +{stages[idx].tasks.length - 3} more...
                              </span>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Floor reflection */}
        <div
          className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, var(--vl-bg-card) 0%, transparent 100%)',
          }}
        />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] vl-text-muted px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>{t(lang, 'pipeline.3d.completed')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[var(--vl-bg-inner)] border border-[var(--vl-border)]" />
          <span>{t(lang, 'pipeline.3d.tasks')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Layers className="size-2.5" />
          <span>{totalStages} stages</span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Eye className="size-2.5" />
          <span>{t(lang, 'pipeline.3d.clickToZoom')}</span>
        </div>
      </div>
    </div>
  )
}
