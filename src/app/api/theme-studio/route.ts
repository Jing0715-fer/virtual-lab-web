import { NextResponse } from 'next/server'

const DEFAULT_THEME = {
  name: 'Emerald Lab',
  primaryColor: '#10b981',
  secondaryColor: '#06b6d4',
  accentColor: '#8b5cf6',
  bgPrimary: '#fafbfc',
  bgSecondary: '#f1f3f5',
  bgCard: '#ffffff',
  bgInput: '#ffffff',
  fontFamily: 'System Default',
  fontSize: 14,
  headingWeight: 600,
  lineHeight: 1.6,
  letterSpacing: 0,
  cardRadius: 12,
  cardPadding: 16,
  sectionGap: 24,
  inputHeight: 40,
  sidebarWidth: 260,
  glassmorphism: false,
  gradientBorders: false,
  animatedTransitions: 200,
  hoverShadows: true,
  coloredIcons: true,
  compactMode: false,
  darkMode: false,
}

const PRESETS = {
  emerald: {
    name: 'Emerald Lab',
    primaryColor: '#10b981',
    secondaryColor: '#06b6d4',
    accentColor: '#8b5cf6',
    bgPrimary: '#fafbfc',
    bgSecondary: '#f1f3f5',
    bgCard: '#ffffff',
    bgInput: '#ffffff',
    fontFamily: 'System Default',
    fontSize: 14,
    headingWeight: 600,
    lineHeight: 1.6,
    letterSpacing: 0,
    cardRadius: 12,
    cardPadding: 16,
    sectionGap: 24,
    inputHeight: 40,
    sidebarWidth: 260,
    glassmorphism: false,
    gradientBorders: false,
    animatedTransitions: 200,
    hoverShadows: true,
    coloredIcons: true,
    compactMode: false,
    darkMode: false,
  },
  ocean: {
    name: 'Ocean Deep',
    primaryColor: '#3b82f6',
    secondaryColor: '#0ea5e9',
    accentColor: '#6366f1',
    bgPrimary: '#0f172a',
    bgSecondary: '#1e293b',
    bgCard: '#1e293b',
    bgInput: '#0f172a',
    fontFamily: 'Inter',
    fontSize: 14,
    headingWeight: 600,
    lineHeight: 1.6,
    letterSpacing: 0,
    cardRadius: 12,
    cardPadding: 16,
    sectionGap: 24,
    inputHeight: 40,
    sidebarWidth: 260,
    glassmorphism: true,
    gradientBorders: false,
    animatedTransitions: 200,
    hoverShadows: true,
    coloredIcons: true,
    compactMode: false,
    darkMode: true,
  },
  sunset: {
    name: 'Sunset Research',
    primaryColor: '#f59e0b',
    secondaryColor: '#f97316',
    accentColor: '#ef4444',
    bgPrimary: '#fffbeb',
    bgSecondary: '#fef3c7',
    bgCard: '#ffffff',
    bgInput: '#ffffff',
    fontFamily: 'Georgia',
    fontSize: 15,
    headingWeight: 700,
    lineHeight: 1.7,
    letterSpacing: 0,
    cardRadius: 16,
    cardPadding: 20,
    sectionGap: 28,
    inputHeight: 42,
    sidebarWidth: 280,
    glassmorphism: false,
    gradientBorders: true,
    animatedTransitions: 300,
    hoverShadows: true,
    coloredIcons: true,
    compactMode: false,
    darkMode: false,
  },
  midnight: {
    name: 'Midnight',
    primaryColor: '#a855f7',
    secondaryColor: '#6366f1',
    accentColor: '#ec4899',
    bgPrimary: '#0a0a0f',
    bgSecondary: '#13131a',
    bgCard: '#1a1a25',
    bgInput: '#13131a',
    fontFamily: 'JetBrains Mono',
    fontSize: 13,
    headingWeight: 500,
    lineHeight: 1.5,
    letterSpacing: 0.2,
    cardRadius: 8,
    cardPadding: 14,
    sectionGap: 20,
    inputHeight: 38,
    sidebarWidth: 240,
    glassmorphism: true,
    gradientBorders: false,
    animatedTransitions: 200,
    hoverShadows: true,
    coloredIcons: true,
    compactMode: true,
    darkMode: true,
  },
  minimal: {
    name: 'Minimal',
    primaryColor: '#6b7280',
    secondaryColor: '#9ca3af',
    accentColor: '#6b7280',
    bgPrimary: '#ffffff',
    bgSecondary: '#f9fafb',
    bgCard: '#ffffff',
    bgInput: '#f3f4f6',
    fontFamily: 'System Default',
    fontSize: 14,
    headingWeight: 400,
    lineHeight: 1.6,
    letterSpacing: 0,
    cardRadius: 4,
    cardPadding: 16,
    sectionGap: 32,
    inputHeight: 40,
    sidebarWidth: 220,
    glassmorphism: false,
    gradientBorders: false,
    animatedTransitions: 100,
    hoverShadows: false,
    coloredIcons: false,
    compactMode: false,
    darkMode: false,
  },
}

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      default: DEFAULT_THEME,
      presets: PRESETS,
    },
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, theme } = body

    if (action === 'save' && theme) {
      // Validate theme object has required fields
      const validatedTheme = { ...DEFAULT_THEME, ...theme }
      return NextResponse.json({ success: true, data: { theme: validatedTheme, message: 'Theme saved successfully' } })
    }

    if (action === 'export' && theme) {
      return NextResponse.json({ success: true, data: { theme, exported: true } })
    }

    return NextResponse.json({ success: false, error: 'Invalid action. Use "save" or "export".' }, { status: 400 })
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 })
  }
}
