'use client'

/**
 * useSwipeGesture — Custom hook for touch swipe detection on mobile
 *
 * Provides horizontal and vertical swipe gesture detection with configurable
 * thresholds. Designed for tab navigation and other mobile interactions.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

// ============================================================
// Types
// ============================================================

export interface SwipeCallbacks {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
}

export interface SwipeGestureOptions {
  /** Minimum distance in px to register a swipe (default: 50) */
  minSwipeDistance?: number
  /** Maximum time in ms for a swipe gesture (default: 300) */
  maxSwipeTime?: number
  /** Whether to add swipe-active CSS class during gesture (default: true) */
  visualFeedback?: boolean
}

export interface SwipeState {
  /** Current touch offset X from start */
  deltaX: number
  /** Current touch offset Y from start */
  deltaY: number
  /** Whether a swipe gesture is actively being tracked */
  isSwiping: boolean
  /** Direction of the last completed swipe, if any */
  lastDirection: 'left' | 'right' | 'up' | 'down' | null
}

// ============================================================
// useSwipeGesture Hook
// ============================================================

export function useSwipeGesture(
  ref: React.RefObject<HTMLElement | null>,
  callbacks: SwipeCallbacks,
  options: SwipeGestureOptions = {}
) {
  const {
    minSwipeDistance = 50,
    maxSwipeTime = 300,
    visualFeedback = true,
  } = options

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const [swipeState, setSwipeState] = useState<SwipeState>({
    deltaX: 0,
    deltaY: 0,
    isSwiping: false,
    lastDirection: null,
  })

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0]
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    }
    setSwipeState({ deltaX: 0, deltaY: 0, isSwiping: true, lastDirection: null })

    if (visualFeedback && ref.current) {
      ref.current.classList.add('swipe-active')
    }
  }, [ref, visualFeedback])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchStartRef.current) return

    const touch = e.touches[0]
    const deltaX = touch.clientX - touchStartRef.current.x
    const deltaY = touch.clientY - touchStartRef.current.y

    setSwipeState(prev => ({ ...prev, deltaX, deltaY }))

    // Apply visual translation feedback
    if (visualFeedback && ref.current) {
      const absX = Math.abs(deltaX)
      const absY = Math.abs(deltaY)
      // Only apply transform for horizontal swipes (don't interfere with vertical scroll)
      if (absX > absY) {
        // Dampen the movement to provide a natural feel
        const dampenedX = deltaX * 0.3
        ref.current.style.transform = `translateX(${dampenedX}px)`
      }
    }
  }, [ref, visualFeedback])

  const handleTouchEnd = useCallback(() => {
    if (!touchStartRef.current) return

    const { x: startX, y: startY, time: startTime } = touchStartRef.current
    const deltaX = swipeState.deltaX
    const deltaY = swipeState.deltaY
    const elapsed = Date.now() - startTime
    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)

    const isHorizontal = absX > absY
    const isWithinTime = elapsed <= maxSwipeTime
    const isWithinDistance = (isHorizontal ? absX : absY) >= minSwipeDistance

    let direction: 'left' | 'right' | 'up' | 'down' | null = null

    if (isHorizontal && isWithinTime && isWithinDistance) {
      if (deltaX > 0) {
        direction = 'right'
        callbacks.onSwipeRight?.()
      } else {
        direction = 'left'
        callbacks.onSwipeLeft?.()
      }
    } else if (!isHorizontal && isWithinTime && isWithinDistance) {
      if (deltaY > 0) {
        direction = 'down'
        callbacks.onSwipeDown?.()
      } else {
        direction = 'up'
        callbacks.onSwipeUp?.()
      }
    }

    setSwipeState({ deltaX: 0, deltaY: 0, isSwiping: false, lastDirection: direction })

    // Cleanup visual feedback
    if (ref.current) {
      ref.current.classList.remove('swipe-active')
      ref.current.style.transform = ''
    }

    touchStartRef.current = null
  }, [callbacks, minSwipeDistance, maxSwipeTime, ref, swipeState.deltaX, swipeState.deltaY])

  useEffect(() => {
    const el = ref.current
    if (!el) return

    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove', handleTouchMove, { passive: true })
    el.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
    }
  }, [ref, handleTouchStart, handleTouchMove, handleTouchEnd])

  return swipeState
}

// ============================================================
// SwipeContainer Component
// ============================================================

/**
 * Wrapper component that provides swipe gesture support for its children.
 * Adds visual feedback and `swipe-active` CSS class during active swipes.
 */
export function SwipeContainer({
  children,
  callbacks,
  options,
  className = '',
  as: Component = 'div',
  ...props
}: {
  children: React.ReactNode
  callbacks: SwipeCallbacks
  options?: SwipeGestureOptions
  className?: string
  as?: React.ElementType
} & Omit<React.HTMLAttributes<HTMLElement>, 'className'>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const swipeState = useSwipeGesture(containerRef as React.RefObject<HTMLElement | null>, callbacks, options)

  return (
    <Component
      ref={containerRef as React.Ref<HTMLElement>}
      className={`swipe-container ${className}`}
      data-swiping={swipeState.isSwiping || undefined}
      {...props}
    >
      {children}
      {/* Swipe indicator bar */}
      <div
        className={`swipe-indicator ${swipeState.isSwiping ? 'swipe-indicator-active' : ''}`}
        style={{
          transform: swipeState.isSwiping && swipeState.deltaX !== 0
            ? `translateX(${swipeState.deltaX}px)`
            : undefined,
          opacity: swipeState.isSwiping ? 1 : 0,
        }}
      />
    </Component>
  )
}

/**
 * Utility to detect if the device supports touch.
 * Returns true for touch-capable devices.
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

/**
 * Utility to detect if viewport is mobile width.
 * Returns true for screens <= 768px.
 */
export function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(max-width: 768px)').matches
}
