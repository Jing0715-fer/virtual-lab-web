'use client'

import React, { useMemo } from 'react'
import { Flame } from 'lucide-react'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import type { Meeting } from './shared-components'

interface DayData {
  date: string
  count: number
}

function getHeatmapLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0
  if (count <= 2) return 1
  if (count <= 5) return 2
  if (count <= 8) return 3
  return 4
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function ActivityHeatmapWidget({ lang, meetings }: { lang: Lang; meetings: Meeting[] }) {
  const heatmapData = useMemo(() => {
    const dayMap = new Map<string, number>()
    const completedMeetings = meetings.filter(m => m.status === 'completed')

    completedMeetings.forEach(m => {
      const date = m.createdAt.split('T')[0]
      const msgCount = (m.messages || []).length
      dayMap.set(date, (dayMap.get(date) || 0) + msgCount)
    })

    // Generate last 90 days
    const days: DayData[] = []
    const today = new Date()
    for (let i = 89; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = formatDate(d)
      days.push({
        date: dateStr,
        count: dayMap.get(dateStr) || 0,
      })
    }

    return days
  }, [meetings])

  const hasActivity = heatmapData.some(d => d.count > 0)

  // Group into weeks (7 columns = days, rows = weeks)
  const weeks = useMemo(() => {
    const result: DayData[][] = []
    for (let i = 0; i < heatmapData.length; i += 7) {
      result.push(heatmapData.slice(i, i + 7))
    }
    return result
  }, [heatmapData])

  const dayLabels = ['M', '', 'W', '', 'F', '', '']
  const totalMessages = heatmapData.reduce((s, d) => s + d.count, 0)

  return (
    <div className="space-y-3">
      {!hasActivity ? (
        <div className="vl-inner rounded-xl py-8 flex flex-col items-center justify-center">
          <Flame className="size-8 vl-text-muted mb-2 vl-float-animation" />
          <p className="text-xs vl-text-muted">{t(lang, 'dashboard.widgets.heatmap.noActivity')}</p>
          <p className="text-[10px] vl-text-muted mt-1">{t(lang, 'dashboard.widgets.heatmap.noActivityDesc')}</p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] vl-text-muted">
              {t(lang, 'dashboard.widgets.heatmap.title')}
            </span>
            <span className="text-[10px] font-medium vl-text-heading">
              {totalMessages} {t(lang, 'common.messages')}
            </span>
          </div>

          {/* Heatmap grid */}
          <div className="overflow-x-auto custom-scrollbar">
            <div className="inline-flex gap-[3px] items-start">
              {/* Day labels column */}
              <div className="flex flex-col gap-[3px] mr-1 pt-0">
                {dayLabels.map((label, i) => (
                  <div
                    key={i}
                    className="text-[8px] vl-text-muted text-right leading-none"
                    style={{ height: 12, lineHeight: '12px' }}
                  >
                    {label}
                  </div>
                ))}
              </div>

              {/* Weeks */}
              {weeks.map((week, weekIdx) => (
                <div key={weekIdx} className="flex flex-col gap-[3px]">
                  {week.map((day) => {
                    const level = getHeatmapLevel(day.count)
                    return (
                      <div
                        key={day.date}
                        className={`heatmap-cell heatmap-level-${level} relative`}
                        title={`${day.count} messages on ${day.date}`}
                      >
                        <div className="heatmap-tooltip">
                          {day.count > 0
                            ? t(lang, 'dashboard.widgets.heatmap.messagesOn')
                                .replace('{count}', String(day.count))
                                .replace('{date}', day.date)
                            : t(lang, 'dashboard.widgets.heatmap.noMessages')
                          }
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-end gap-1.5">
            <span className="text-[8px] vl-text-muted">{t(lang, 'dashboard.widgets.heatmap.legend.less')}</span>
            {[0, 1, 2, 3, 4].map(level => (
              <div
                key={level}
                className={`heatmap-cell heatmap-level-${level}`}
                style={{ width: 10, height: 10 }}
              />
            ))}
            <span className="text-[8px] vl-text-muted">{t(lang, 'dashboard.widgets.heatmap.legend.more')}</span>
          </div>
        </>
      )}
    </div>
  )
}
