'use client'

import { useEffect, useState } from 'react'

export function useResizeObserver(ref: React.RefObject<HTMLElement | null>) {
  const [dimensions, setDimensions] = useState<DOMRectReadOnly | null>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions(entry.contentRect)
      }
    })

    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])

  return dimensions
}
