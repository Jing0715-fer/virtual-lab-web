'use client'

/**
 * Optimized Hero Image component with blur placeholder
 *
 * Uses the Next.js Image component with unoptimized prop (no CDN)
 * and a base64 blur placeholder for progressive loading UX.
 */

import React, { useState } from 'react'

// Pre-computed blur data URI from the hero image (16x16 thumbnail)
const HERO_BLUR_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAACqUlEQVR4nAXBa2/bVBgA4HN5zzk+ji9xUsdt6QrV1o4mtBIDNKnjoiH+AEz8A/4gX5H2dfCBIi5VgHXrBaVxmtZzHMeX2D4+PA92Nodgunwj0EWBlVKqaTXChGKMkdZACWVcI62QrldJkyXAhEml2en7datqhMhy2abLapViQrllI7eruaCGIaSRvx6365IcHn1EhdlkGRCqMaVBwIdHtD8A2zV296y9AyRM3aI6WmAmhsdHZPznX0hrYdtlpWjX11nVLlPS9bC0OSVOcouzDHa25ONHLUJnp6dAmaEBKtPCXKOnX+HzMaSRmkyINBEV9Uph6Zj9PlBaSsm8Hv7w2XclAs0lIqCEqR1HA1QX523VSK9PXVtzhpWqL98OuoZjmWR7O7A7kg4C95vnTJXsdtKjFUjD++IZZbSz5ZNZ2P/6c+HZSRyn5RquLq4V5fTBYaIskJK7TrW5Y3DHeHLSclFrTASLZ4UjJHFdwQ1yOBoGjtVna4PkKoqQ29ve2c5ScvFLSHj3+MtPu33fKO6Dpx/7jsOQIhoh399YYRPl66bK0ziOi2bzs9HJD89hK/htuio7HTBlJjxpW0VeAgAPw/Dy9fz9b18cfv9i5JgD2z2jtm9m/lbwUNZn5ifjmyw6/b26nzDRAWAcgLH1fZHm19w1opXKmllbXurWny2mzburBlRJoqs3uzveWmkIry+yvKRNYXimKrLxdP7qnz+AM2k7b5MIQ0c+HopHH6hVPAvzqshBW5a94eNJmP573mLkLBJxN7mbzZmUAKx7fLIu0vrvNyqJrP0nFaakSM5MAcHuA/TzT87dvMVECQtTQJQKp9tKCdOb6uWPklEpxf1/v8LdbNJ7KA72D25NGff8ZThVHU+ONvG7GX1vr24qb380QKUBbBHPF9HN/x0tOoZI2KZlAAAAAElFTkSuQmCC'

interface OptimizedHeroImageProps {
  src?: string
  alt?: string
  className?: string
  priority?: boolean
}

export function OptimizedHeroImage({
  src = '/virtual-lab-hero.png',
  alt = 'Virtual Lab — AI-Human Collaboration for Scientific Research',
  className = '',
  priority = false,
}: OptimizedHeroImageProps) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Blur placeholder (always visible, fades out when loaded) */}
      <div
        className="absolute inset-0 transition-opacity duration-700 ease-out"
        style={{
          opacity: loaded ? 0 : 1,
          backgroundImage: `url(${HERO_BLUR_DATA_URL})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(20px)',
          transform: 'scale(1.1)',
        }}
      />
      {/* Actual image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        onLoad={() => setLoaded(true)}
        className={`relative z-10 w-full h-full object-cover transition-opacity duration-700 ease-out ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  )
}

/**
 * Image size constants for optimized loading.
 * These represent the actual dimensions of images in /public/.
 */
export const IMAGE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  'virtual-lab-hero.png': { width: 1344, height: 768 },
  'logo.svg': { width: 160, height: 160 },
  'icon-192.png': { width: 192, height: 192 },
  'icon-512.png': { width: 512, height: 512 },
}
