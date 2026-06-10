'use client'

import { useRef, useCallback, useEffect, useState } from 'react'

// ============================================================
// useLongPress Hook
// ============================================================
export function useLongPress(
  callback: () => void,
  { delay = 500, threshold = 10 } = {}
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startPosRef = useRef<{ x: number; y: number } | null>(null)
  const [isPressed, setIsPressed] = useState(false)

  const start = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      const point = 'touches' in e ? e.touches[0] : e
      startPosRef.current = { x: point.clientX, y: point.clientY }
      timerRef.current = setTimeout(() => {
        setIsPressed(true)
        callback()
      }, delay)
    },
    [callback, delay]
  )

  const move = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if (!startPosRef.current) return
      const point = 'touches' in e ? e.touches[0] : e
      const dx = point.clientX - startPosRef.current.x
      const dy = point.clientY - startPosRef.current.y
      if (Math.sqrt(dx * dx + dy * dy) > threshold) {
        if (timerRef.current) {
          clearTimeout(timerRef.current)
          timerRef.current = null
        }
      }
    },
    [threshold]
  )

  const end = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    startPosRef.current = null
    setIsPressed(false)
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return {
    onTouchStart: start,
    onTouchMove: move,
    onTouchEnd: end,
    onMouseDown: start,
    onMouseMove: move,
    onMouseUp: end,
    isPressed,
    pressableProps: {
      onTouchStart: start,
      onTouchMove: move,
      onTouchEnd: end,
      onMouseDown: start,
      onMouseMove: move,
      onMouseUp: end,
      'aria-pressed': isPressed,
    },
  }
}

// ============================================================
// useSwipeDirection Hook
// ============================================================
type SwipeDirection = 'up' | 'down' | 'left' | 'right' | null

export function useSwipeDirection(
  options: {
    onSwipeUp?: () => void
    onSwipeDown?: () => void
    onSwipeLeft?: () => void
    onSwipeRight?: () => void
    minDistance?: number
    maxSwipeTime?: number
  } = {}
) {
  const { minDistance = 50, maxSwipeTime = 300 } = options
  const startPosRef = useRef<{ x: number; y: number; time: number } | null>(null)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    startPosRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    }
  }, [])

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!startPosRef.current) return
      const touch = e.changedTouches[0]
      const dx = touch.clientX - startPosRef.current.x
      const dy = touch.clientY - startPosRef.current.y
      const elapsed = Date.now() - startPosRef.current.time

      if (elapsed > maxSwipeTime) return

      const absDx = Math.abs(dx)
      const absDy = Math.abs(dy)
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance < minDistance) return

      if (absDx > absDy) {
        if (dx > 0) options.onSwipeRight?.()
        else options.onSwipeLeft?.()
      } else {
        if (dy > 0) options.onSwipeDown?.()
        else options.onSwipeUp?.()
      }

      startPosRef.current = null
    },
    [minDistance, maxSwipeTime, options]
  )

  return { onTouchStart, onTouchEnd }
}

// ============================================================
// PullToRefresh Component
// ============================================================
interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: React.ReactNode
  className?: string
}

export function PullToRefresh({ onRefresh, children, className = '' }: PullToRefreshProps) {
  const [pulling, setPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startYRef = useRef<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const PULL_THRESHOLD = 80
  const MAX_PULL = 120

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY
  }, [])

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (startYRef.current === null || !containerRef.current) return
      const scrollTop = containerRef.current.scrollTop
      if (scrollTop > 0) return

      const distance = e.touches[0].clientY - startYRef.current
      if (distance > 0) {
        const clamped = Math.min(distance * 0.5, MAX_PULL)
        setPullDistance(clamped)
        setPulling(true)
      }
    },
    []
  )

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= PULL_THRESHOLD * 0.5) {
      setPullDistance(MAX_PULL)
      try {
        await onRefresh()
      } catch {
        // ignore
      }
    }
    setPulling(false)
    setPullDistance(0)
    startYRef.current = null
  }, [pullDistance, onRefresh])

  return (
    <div
      ref={containerRef}
      className={`touch-scroll-container ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {pulling && (
        <div
          className="flex items-center justify-center gap-2 text-sm vl-text-muted py-2 transition-all duration-200"
          style={{ opacity: Math.min(pullDistance / 40, 1) }}
        >
          <div
            className="w-5 h-5 border-2 border-current rounded-full"
            style={{
              transform: `rotate(${pullDistance * 3}deg)`,
            }}
          />
          <span className="text-xs">Pull to refresh</span>
        </div>
      )}
      {children}
    </div>
  )
}

// ============================================================
// Touch Ripple Component (CSS-based)
// ============================================================
interface TouchRippleProps {
  children: React.ReactNode
  className?: string
  color?: string
}

export function TouchRipple({ children, className = '', color }: TouchRippleProps) {
  return (
    <div
      className={`touch-ripple relative ${className}`}
      style={
        color
          ? {
              '--ripple-color': color,
            } as React.CSSProperties
          : undefined
      }
    >
      {children}
    </div>
  )
}
