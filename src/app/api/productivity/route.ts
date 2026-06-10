import { NextResponse } from "next/server";

// ============================================================
// Types
// ============================================================

interface FocusSession {
  id: string;
  mode: string;
  phase: string;
  durationSeconds: number;
  completedAt: string;
  status: string;
  notes: string;
  associatedTask: string;
  associatedAgent: string;
  associatedMeeting: string;
}

interface TimerSettings {
  pomodoroWork: number;
  pomodoroShortBreak: number;
  pomodoroLongBreak: number;
  pomodorosBeforeLongBreak: number;
  customWork: number;
  customBreak: number;
  countdownMinutes: number;
  soundEnabled: boolean;
  soundVolume: number;
  dailyGoal: number;
}

// In-memory store (simulates persistent storage for demo)
let sessions: FocusSession[] = [];
let settings: TimerSettings = {
  pomodoroWork: 25,
  pomodoroShortBreak: 5,
  pomodoroLongBreak: 15,
  pomodorosBeforeLongBreak: 4,
  customWork: 30,
  customBreak: 10,
  countdownMinutes: 10,
  soundEnabled: true,
  soundVolume: 0.5,
  dailyGoal: 8,
};
let sampleDataGenerated = false;

// ============================================================
// Sample Data Generator
// ============================================================

function generateSampleData(): void {
  if (sampleDataGenerated) return;
  sampleDataGenerated = true;

  const modes: Array<{ mode: string; phase: string }> = [
    { mode: "pomodoro", phase: "work" },
    { mode: "pomodoro", phase: "short-break" },
    { mode: "pomodoro", phase: "long-break" },
    { mode: "deep-work", phase: "work" },
    { mode: "countdown", phase: "work" },
    { mode: "custom", phase: "work" },
    { mode: "stopwatch", phase: "work" },
  ];

  const tasks = [
    "Literature review - CRISPR paper",
    "Protein structure analysis with AlphaFold",
    "Write methods section for manuscript",
    "Data analysis - RNA-seq pipeline",
    "Prepare presentation slides",
    "Debug bioinformatics pipeline",
    "Review team meeting notes",
    "Design next experiment",
    "Code refactoring - data models",
    "Analyze western blot results",
    "Write introduction draft",
    "Statistical analysis for Figure 3",
    "Lab notebook documentation",
    "Grant proposal writing",
    "Compare ML models performance",
  ];

  const notes = [
    "Found promising lead compounds in virtual screening.",
    "Completed alignment of 500 protein sequences.",
    "Identified a key pathway interaction to investigate further.",
    "Debugged the data pipeline, all tests passing now.",
    "Reviewed 8 papers, summarized key findings.",
    "Prepared figures for the upcoming conference.",
    "Made significant progress on the analysis section.",
    "Optimized the model, improved accuracy by 12%.",
  ];

  const now = Date.now();
  const dayMs = 86400000;
  const hourMs = 3600000;

  for (let d = 29; d >= 0; d--) {
    const dayOffset = d * dayMs;
    // Each day has 2-6 sessions
    const numSessions = Math.floor(Math.random() * 5) + 2;

    for (let s = 0; s < numSessions; s++) {
      const modeInfo = modes[Math.floor(Math.random() * modes.length)];
      // Work sessions: 15-60 min, break sessions: 3-15 min
      const isWork = modeInfo.phase === "work";
      const durationSec = isWork
        ? (Math.floor(Math.random() * 45) + 15) * 60
        : (Math.floor(Math.random() * 12) + 3) * 60;

      const hourOfDay = 7 + Math.floor(Math.random() * 14); // 7am-9pm
      const completedAt = new Date(
        now - dayOffset + hourOfDay * hourMs + Math.floor(Math.random() * hourMs)
      ).toISOString();

      // 85% completed, 15% abandoned
      const status = Math.random() > 0.15 ? "completed" : "abandoned";

      const session: FocusSession = {
        id: `sample-${d}-${s}-${Date.now()}`,
        mode: modeInfo.mode,
        phase: modeInfo.phase,
        durationSeconds: status === "completed" ? durationSec : Math.floor(durationSec * (0.2 + Math.random() * 0.5)),
        completedAt,
        status,
        notes: isWork && status === "completed" && Math.random() > 0.4
          ? notes[Math.floor(Math.random() * notes.length)]
          : "",
        associatedTask: isWork ? tasks[Math.floor(Math.random() * tasks.length)] : "",
        associatedAgent: Math.random() > 0.7 ? `agent-${Math.floor(Math.random() * 5) + 1}` : "",
        associatedMeeting: Math.random() > 0.8 ? `meeting-${Math.floor(Math.random() * 3) + 1}` : "",
      };

      sessions.push(session);
    }
  }

  // Sort by completedAt descending
  sessions.sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  );
}

// ============================================================
// Utility helpers
// ============================================================

function getTodayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function calculateStats(sessionsList: FocusSession[], period: "daily" | "weekly" | "monthly") {
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case "daily":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "weekly":
      startDate = new Date(now.getTime() - 6 * 86400000);
      startDate.setHours(0, 0, 0, 0);
      break;
    case "monthly":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
  }

  const filtered = sessionsList.filter((s) => {
    return s.status === "completed" && new Date(s.completedAt) >= startDate;
  });

  const totalFocusMin = filtered
    .filter((s) => s.phase === "work")
    .reduce((sum, s) => sum + Math.round(s.durationSeconds / 60), 0);

  const totalBreakMin = filtered
    .filter((s) => s.phase !== "work")
    .reduce((sum, s) => sum + Math.round(s.durationSeconds / 60), 0);

  const deepWorkMin = filtered
    .filter((s) => s.mode === "deep-work")
    .reduce((sum, s) => sum + Math.round(s.durationSeconds / 60), 0);

  const sessionCount = filtered.length;

  const avgSessionLength =
    sessionCount > 0
      ? Math.round(
          filtered.reduce((sum, s) => sum + s.durationSeconds, 0) / sessionCount / 60
        )
      : 0;

  // Streak
  let currentStreak = 0;
  const checkDate = new Date();
  while (true) {
    const dateStr = checkDate.toISOString().split("T")[0];
    const hasSession = sessionsList.some(
      (s) => s.completedAt.startsWith(dateStr) && s.status === "completed"
    );
    if (!hasSession) break;
    currentStreak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return {
    period,
    totalFocusMin,
    totalBreakMin,
    deepWorkMin,
    sessionCount,
    avgSessionLength,
    currentStreak,
    startDate: startDate.toISOString(),
    endDate: now.toISOString(),
  };
}

// ============================================================
// GET /api/productivity
// ============================================================

export async function GET(request: Request) {
  try {
    generateSampleData();

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "sessions";

    switch (action) {
      // ---- List sessions with filters and pagination ----
      case "sessions": {
        const type = searchParams.get("type");
        const status = searchParams.get("status");
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const limit = parseInt(searchParams.get("limit") || "50", 10);
        const offset = parseInt(searchParams.get("offset") || "0", 10);

        let filtered = [...sessions];

        if (type) {
          filtered = filtered.filter((s) => s.mode === type || s.phase === type);
        }
        if (status) {
          filtered = filtered.filter((s) => s.status === status);
        }
        if (startDate) {
          filtered = filtered.filter(
            (s) => new Date(s.completedAt) >= new Date(startDate)
          );
        }
        if (endDate) {
          filtered = filtered.filter(
            (s) => new Date(s.completedAt) <= new Date(endDate)
          );
        }

        const total = filtered.length;
        const paginated = filtered.slice(offset, offset + limit);

        return NextResponse.json({
          sessions: paginated,
          total,
          limit,
          offset,
        });
      }

      // ---- Aggregate statistics ----
      case "stats": {
        const period = (searchParams.get("period") || "daily") as "daily" | "weekly" | "monthly";
        const stats = calculateStats(sessions, period);

        return NextResponse.json(stats);
      }

      // ---- Streak data ----
      case "streak": {
        const days = parseInt(searchParams.get("days") || "30", 10);
        const now = new Date();
        const calendarData: Array<{
          date: string;
          focusMin: number;
          sessionCount: number;
          hasActivity: boolean;
        }> = [];

        for (let i = days - 1; i >= 0; i--) {
          const date = new Date(now.getTime() - i * 86400000);
          const dateStr = date.toISOString().split("T")[0];
          const daySessions = sessions.filter(
            (s) => s.completedAt.startsWith(dateStr) && s.status === "completed"
          );
          const focusMin = daySessions
            .filter((s) => s.phase === "work")
            .reduce((sum, s) => sum + Math.round(s.durationSeconds / 60), 0);

          calendarData.push({
            date: dateStr,
            focusMin,
            sessionCount: daySessions.length,
            hasActivity: daySessions.length > 0,
          });
        }

        // Calculate longest streak
        let longestStreak = 0;
        let tmpStreak = 0;
        const allDates = [...new Set(sessions.filter((s) => s.status === "completed").map((s) => s.completedAt.split("T")[0]))].sort();
        for (let i = 0; i < allDates.length; i++) {
          if (i === 0) {
            tmpStreak = 1;
          } else {
            const prev = new Date(allDates[i - 1] + "T12:00:00");
            const curr = new Date(allDates[i] + "T12:00:00");
            const diffDays = Math.round(
              (curr.getTime() - prev.getTime()) / 86400000
            );
            if (diffDays === 1) {
              tmpStreak++;
            } else {
              tmpStreak = 1;
            }
          }
          longestStreak = Math.max(longestStreak, tmpStreak);
        }

        const todayStr = getTodayStr();
        const currentStreak = (() => {
          let streak = 0;
          const checkDate = new Date();
          while (true) {
            const ds = checkDate.toISOString().split("T")[0];
            if (!allDates.includes(ds)) break;
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
          }
          return streak;
        })();

        return NextResponse.json({
          currentStreak,
          longestStreak,
          calendar: calendarData,
        });
      }

      // ---- Heatmap data ----
      case "heatmap": {
        const weeks = parseInt(searchParams.get("weeks") || "4", 10);
        const now = new Date();
        const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        const heatmapCells: Array<{
          week: number;
          dayIndex: number;
          date: string;
          hours: number;
          sessions: number;
        }> = [];

        for (let w = weeks - 1; w >= 0; w--) {
          const weekStartDay = now.getDay();
          const mondayOffset = weekStartDay === 0 ? -6 : 1 - weekStartDay;
          const weekStart = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + mondayOffset - w * 7
          );

          for (let d = 0; d < 7; d++) {
            const date = new Date(weekStart.getTime() + d * 86400000);
            const dateStr = date.toISOString().split("T")[0];
            const daySessions = sessions.filter(
              (s) => s.completedAt.startsWith(dateStr) && s.status === "completed"
            );
            const focusHours =
              daySessions
                .filter((s) => s.phase === "work")
                .reduce((sum, s) => sum + s.durationSeconds, 0) / 3600;

            heatmapCells.push({
              week: weeks - 1 - w,
              dayIndex: d,
              date: dateStr,
              hours: Math.round(focusHours * 100) / 100,
              sessions: daySessions.length,
            });
          }
        }

        return NextResponse.json({
          dayNames,
          weeks,
          cells: heatmapCells,
        });
      }

      // ---- Settings ----
      case "settings": {
        return NextResponse.json(settings);
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Use: sessions, stats, streak, heatmap, settings` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Productivity API GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch productivity data" },
      { status: 500 }
    );
  }
}

// ============================================================
// POST /api/productivity
// ============================================================

export async function POST(request: Request) {
  try {
    generateSampleData();

    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      // ---- Create a new session ----
      case "session": {
        const { mode, phase, durationSeconds, notes, associatedTask, associatedAgent, associatedMeeting } = data;

        if (!mode || !phase) {
          return NextResponse.json(
            { error: "mode and phase are required" },
            { status: 400 }
          );
        }

        const session: FocusSession = {
          id: `api-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          mode: mode || "pomodoro",
          phase: phase || "work",
          durationSeconds: durationSeconds || 0,
          completedAt: new Date().toISOString(),
          status: "completed",
          notes: notes || "",
          associatedTask: associatedTask || "",
          associatedAgent: associatedAgent || "",
          associatedMeeting: associatedMeeting || "",
        };

        sessions.unshift(session);

        return NextResponse.json(session, { status: 201 });
      }

      // ---- Update settings ----
      case "settings": {
        const updated = { ...settings, ...data };
        settings = updated;
        return NextResponse.json(updated);
      }

      // ---- Bulk import sessions ----
      case "bulk-import": {
        const { sessions: importedSessions } = data as { sessions: FocusSession[] };
        if (!Array.isArray(importedSessions)) {
          return NextResponse.json(
            { error: "sessions array is required" },
            { status: 400 }
          );
        }
        const validSessions = importedSessions
          .filter((s) => s.mode && s.phase && s.completedAt)
          .map((s) => ({
            ...s,
            id: s.id || `import-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          }));
        sessions = [...validSessions, ...sessions];
        return NextResponse.json({
          imported: validSessions.length,
          total: sessions.length,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Use: session, settings, bulk-import` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Productivity API POST error:", error);
    return NextResponse.json(
      { error: "Failed to create productivity data" },
      { status: 500 }
    );
  }
}

// ============================================================
// PUT /api/productivity
// ============================================================

export async function PUT(request: Request) {
  try {
    generateSampleData();

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Session id is required" },
        { status: 400 }
      );
    }

    const sessionIndex = sessions.findIndex((s) => s.id === id);
    if (sessionIndex === -1) {
      return NextResponse.json(
        { error: `Session ${id} not found` },
        { status: 404 }
      );
    }

    // Allowed updates
    const allowedFields: (keyof FocusSession)[] = [
      "notes",
      "status",
      "associatedTask",
      "associatedAgent",
      "associatedMeeting",
    ];

    const updatedSession = { ...sessions[sessionIndex] };
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        (updatedSession as Record<string, unknown>)[key] = updates[key];
      }
    }

    sessions[sessionIndex] = updatedSession;

    return NextResponse.json(updatedSession);
  } catch (error) {
    console.error("Productivity API PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update session" },
      { status: 500 }
    );
  }
}

// ============================================================
// DELETE /api/productivity
// ============================================================

export async function DELETE(request: Request) {
  try {
    generateSampleData();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Session id is required (query param)" },
        { status: 400 }
      );
    }

    const sessionIndex = sessions.findIndex((s) => s.id === id);
    if (sessionIndex === -1) {
      return NextResponse.json(
        { error: `Session ${id} not found` },
        { status: 404 }
      );
    }

    const deleted = sessions.splice(sessionIndex, 1)[0];

    return NextResponse.json({
      deleted: true,
      session: deleted,
      remaining: sessions.length,
    });
  } catch (error) {
    console.error("Productivity API DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete session" },
      { status: 500 }
    );
  }
}
