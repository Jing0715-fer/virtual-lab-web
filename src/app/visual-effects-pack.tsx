'use client'

/**
 * Visual Effects Pack — Barrel Export
 *
 * Re-exports all visual effect components from the Visual Effects & Micro-Interactions Pack.
 * This file serves as the single import point for all visual polish components.
 *
 * Usage:
 *   import { ParallaxHero, ThreeDCard, MagneticButton, ... } from '@/app/visual-effects-pack'
 */

// Parallax Hero
export { ParallaxHero } from './parallax-hero'

// 3D Card Effect
export { ThreeDCard } from './3d-card-effect'

// Micro-Interactions
export {
  MagneticButton,
  RippleEffect,
  MorphingIcon,
  CountUpNumber,
  TypewriterText,
  ShimmerButton,
} from './micro-interactions'

// Enhanced Scroll Progress
export { EnhancedScrollProgress } from './scroll-progress-enhanced'
export type { ScrollSection } from './scroll-progress-enhanced'

// Enhanced Glassmorphism
export { GlassCard, GlassToolbar, GlassBadge } from './glassmorphism-enhanced'
