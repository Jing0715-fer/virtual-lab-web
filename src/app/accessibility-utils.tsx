'use client'

/**
 * Accessibility Utilities
 * Focus trap, ARIA live regions, keyboard navigation, and skip links.
 * All hooks are hydration-safe (no window/document at module scope).
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'

// ============================================================
// useFocusTrap — Traps keyboard focus within a container
// ============================================================

interface UseFocusTrapOptions {
  /** Whether the trap is active */
  active: boolean
  /** Callback when trap would close (Escape key) */
  onClose?: () => void
  /** Allow click outside to deactivate */
  clickOutsideDeactivates?: boolean
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(', ')

export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  options: UseFocusTrapOptions
) {
  const { active, onClose, clickOutsideDeactivates = false } = options
  const previousActiveElement = useRef<HTMLElement | null>(null)

  // Save and restore focus
  useEffect(() => {
    if (active) {
      previousActiveElement.current = document.activeElement as HTMLElement

      // Focus the first focusable element after a tick
      const timer = requestAnimationFrame(() => {
        if (!containerRef.current) return
        const focusable = containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        if (focusable.length > 0) {
          focusable[0].focus()
        } else {
          // If no focusable elements, make container focusable
          containerRef.current.setAttribute('tabindex', '-1')
          containerRef.current.focus()
        }
      })

      return () => {
        cancelAnimationFrame(timer)
        // Restore focus on cleanup
        if (previousActiveElement.current && previousActiveElement.current.focus) {
          previousActiveElement.current.focus()
        }
      }
    }
  }, [active, containerRef])

  // Handle keyboard events
  useEffect(() => {
    if (!active) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose?.()
        return
      }

      if (e.key !== 'Tab') return
      if (!containerRef.current) return

      const focusable = Array.from(
        containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      )

      if (focusable.length === 0) {
        e.preventDefault()
        return
      }

      const firstEl = focusable[0]
      const lastEl = focusable[focusable.length - 1]

      if (e.shiftKey) {
        // Shift+Tab: wrap from first to last
        if (document.activeElement === firstEl || !containerRef.current.contains(document.activeElement)) {
          e.preventDefault()
          lastEl.focus()
        }
      } else {
        // Tab: wrap from last to first
        if (document.activeElement === lastEl || !containerRef.current.contains(document.activeElement)) {
          e.preventDefault()
          firstEl.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [active, containerRef, onClose])

  // Handle click outside
  useEffect(() => {
    if (!active || !clickOutsideDeactivates) return

    const handleClick = (e: MouseEvent) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(e.target as Node)) {
        onClose?.()
      }
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [active, clickOutsideDeactivates, containerRef, onClose])
}

// ============================================================
// useAnnounce — Announces dynamic content to screen readers
// ============================================================

const announceTimers: Record<string, NodeJS.Timeout> = {}

export function useAnnounce() {
  const [announcements, setAnnouncements] = useState<{ id: string; text: string; assertive: boolean }[]>([])

  const announce = useCallback((text: string, options?: { assertive?: boolean; timeout?: number; key?: string }) => {
    const { assertive = false, timeout = 5000, key } = options || {}
    const id = key || `announce-${Date.now()}`

    // Clear previous timer for same key
    if (key && announceTimers[key]) {
      clearTimeout(announceTimers[key])
    }

    setAnnouncements(prev => {
      // Remove previous announcement with same key
      const filtered = key ? prev.filter(a => a.id !== key) : prev
      return [...filtered, { id, text, assertive }]
    })

    // Auto-clear after delay
    const timer = setTimeout(() => {
      setAnnouncements(prev => prev.filter(a => a.id !== id))
    }, timeout)
    if (key) announceTimers[key] = timer

    return () => clearTimeout(timer)
  }, [])

  const announceSSEMessage = useCallback((agentName: string, lang: string) => {
    const text = lang === 'zh'
      ? `${agentName} 发送了新消息`
      : `New message from ${agentName}`
    announce(text, { key: 'sse-message' })
  }, [announce])

  const announceMeetingComplete = useCallback((messageCount: number, meetingName: string, lang: string) => {
    const text = lang === 'zh'
      ? `会议 "${meetingName}" 已完成，共 ${messageCount} 条消息`
      : `Meeting "${meetingName}" completed with ${messageCount} messages`
    announce(text, { assertive: true, key: 'meeting-complete' })
  }, [announce])

  return { announcements, announce, announceSSEMessage, announceMeetingComplete }
}

// ============================================================
// useKeyboardNav — Arrow key navigation for lists/grids
// ============================================================

interface UseKeyboardNavOptions<T> {
  items: T[]
  /** Called when Enter or Space is pressed on an item */
  onActivate?: (item: T, index: number) => void
  /** Orientation of the list */
  orientation?: 'horizontal' | 'vertical' | 'both'
  /** Wrap around at boundaries */
  wrap?: boolean
  /** Initial index */
  initialIndex?: number
}

export function useKeyboardNav<T>(options: UseKeyboardNavOptions<T>) {
  const { items, onActivate, orientation = 'vertical', wrap = true, initialIndex = 0 } = options
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (items.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
      case 'j': {
        if (orientation === 'horizontal') return
        e.preventDefault()
        setCurrentIndex(prev => {
          const next = prev + 1
          if (next >= items.length) return wrap ? 0 : items.length - 1
          return next
        })
        break
      }
      case 'ArrowUp':
      case 'k': {
        if (orientation === 'horizontal') return
        e.preventDefault()
        setCurrentIndex(prev => {
          const next = prev - 1
          if (next < 0) return wrap ? items.length - 1 : 0
          return next
        })
        break
      }
      case 'ArrowRight': {
        if (orientation === 'vertical') return
        e.preventDefault()
        setCurrentIndex(prev => {
          const next = prev + 1
          if (next >= items.length) return wrap ? 0 : items.length - 1
          return next
        })
        break
      }
      case 'ArrowLeft': {
        if (orientation === 'vertical') return
        e.preventDefault()
        setCurrentIndex(prev => {
          const next = prev - 1
          if (next < 0) return wrap ? items.length - 1 : 0
          return next
        })
        break
      }
      case 'Home':
        e.preventDefault()
        setCurrentIndex(0)
        break
      case 'End':
        e.preventDefault()
        setCurrentIndex(items.length - 1)
        break
      case 'Enter':
      case ' ': {
        e.preventDefault()
        if (currentIndex >= 0 && currentIndex < items.length) {
          onActivate?.(items[currentIndex], currentIndex)
        }
        break
      }
    }
  }, [items, currentIndex, onActivate, orientation, wrap])

  // Reset current index if items shrink
  const safeIndex = currentIndex >= items.length ? Math.max(0, items.length - 1) : currentIndex
  const getItemProps = useCallback((index: number) => ({
    tabIndex: index === safeIndex ? 0 : -1,
    'aria-selected': index === safeIndex,
    'data-kb-index': index,
  }), [safeIndex])

  return {
    currentIndex: safeIndex,
    setCurrentIndex,
    handleKeyDown,
    getItemProps,
    containerProps: {
      role: 'listbox' as const,
      'aria-activedescendant': safeIndex >= 0 && safeIndex < items.length
        ? `kb-item-${safeIndex}`
        : undefined,
      onKeyDown: handleKeyDown,
    },
  }
}

// ============================================================
// SkipLinks — Accessible skip navigation links
// ============================================================

export function SkipLinks({ lang }: { lang: string }) {
  const [isEnglish, setIsEnglish] = useState(true)

  useEffect(() => {
    setIsEnglish(lang !== 'zh')
  }, [lang])

  const links = useMemo(() => [
    { href: '#main-content', label: isEnglish ? 'Skip to main content' : '跳转到主要内容' },
    { href: '#tab-navigation', label: isEnglish ? 'Skip to navigation' : '跳转到导航栏' },
  ], [isEnglish])

  return (
    <nav className="skip-links-container" aria-label="Skip links">
      {links.map(link => (
        <a
          key={link.href}
          href={link.href}
          className="skip-link-enhanced"
        >
          {link.label}
        </a>
      ))}
    </nav>
  )
}

// ============================================================
// AriaLiveRegion — Screen reader announcement component
// ============================================================

interface AriaLiveRegionProps {
  announcements: { id: string; text: string; assertive: boolean }[]
}

export function AriaLiveRegion({ announcements }: AriaLiveRegionProps) {
  const politeAnnouncements = useMemo(
    () => announcements.filter(a => !a.assertive),
    [announcements]
  )
  const assertiveAnnouncements = useMemo(
    () => announcements.filter(a => a.assertive),
    [announcements]
  )

  return (
    <>
      {/* Polite region — for non-urgent updates */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="a11y-live-region a11y-live-polite"
      >
        {politeAnnouncements.map(a => (
          <div key={a.id} className="a11y-announcement">{a.text}</div>
        ))}
      </div>
      {/* Assertive region — for important updates */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="a11y-live-region a11y-live-assertive"
      >
        {assertiveAnnouncements.map(a => (
          <div key={a.id} className="a11y-announcement">{a.text}</div>
        ))}
      </div>
    </>
  )
}
