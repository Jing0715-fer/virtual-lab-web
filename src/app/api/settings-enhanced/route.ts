import { NextResponse } from 'next/server'

const DEFAULT_SETTINGS = {
  profile: {
    displayName: 'Researcher',
    email: 'user@virtuallab.io',
    role: 'Principal Investigator',
    institution: 'Virtual Lab Institute',
  },
  appearance: {
    theme: 'system',
    fontSize: 14,
    compactMode: false,
    highContrast: false,
  },
  language: {
    locale: 'en',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    firstDayOfWeek: 'Sunday',
  },
  notifications: {
    meetingStarted: true,
    meetingCompleted: true,
    newMessageInThread: true,
    agentMilestone: true,
    systemAlerts: true,
    dailyDigest: false,
    soundEffects: true,
    soundVolume: 70,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
  },
  data: {
    autoSave: true,
    cacheEnabled: true,
  },
  meetings: {
    defaultRounds: 3,
    defaultTemperature: 0.7,
    autoSaveMeetings: true,
    showTimestamps: true,
    enableSSE: true,
    maxMessageLength: 4096,
  },
  api: {
    provider: 'openai',
    apiKey: '',
    lastVerified: 'Never',
  },
}

export async function GET() {
  return NextResponse.json({
    success: true,
    data: DEFAULT_SETTINGS,
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { section, settings } = body

    if (!section || !settings) {
      return NextResponse.json({ success: false, error: 'Missing section or settings' }, { status: 400 })
    }

    const validSections = ['profile', 'appearance', 'language', 'notifications', 'data', 'meetings', 'api']
    if (!validSections.includes(section)) {
      return NextResponse.json({ success: false, error: `Invalid section: ${section}` }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: { section, settings, message: `${section} settings updated successfully` },
    })
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 })
  }
}
