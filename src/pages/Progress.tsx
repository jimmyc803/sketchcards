import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { FlameIcon } from '../components/icons'
import { useData } from '../data/store'
import { todayLocal } from '../srs/scheduler'
import { calendarWeeks, currentStreak, lastNDays, level, longestStreak, totalReviews } from '../stats/streak'

const MIN_WEEKS = 8
const MAX_WEEKS = 53 // a year

/** How many week columns fit in the box (cell + gap, from the CSS). */
function useWeeksThatFit() {
  const ref = useRef<HTMLDivElement>(null)
  const [weeks, setWeeks] = useState(26)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const cell = parseFloat(getComputedStyle(el).getPropertyValue('--cell')) || 15
      const step = cell + 4
      setWeeks(Math.max(MIN_WEEKS, Math.min(MAX_WEEKS, Math.floor((el.clientWidth + 4) / step))))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, weeks] as const
}

function fmt(date: string, opts: Intl.DateTimeFormatOptions) {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, opts)
}

export default function Progress() {
  const days = useData((s) => s.reviewDays)
  const today = todayLocal()
  const [fitRef, weekCount] = useWeeksThatFit()
  const weeks = useMemo(() => calendarWeeks(days, today, weekCount), [days, today, weekCount])
  const streak = currentStreak(days, today)

  const stats = [
    { label: 'Current streak', value: streak, unit: streak === 1 ? 'day' : 'days', flame: streak > 0 },
    { label: 'Longest streak', value: longestStreak(days), unit: 'days' },
    { label: 'This week', value: lastNDays(days, today, 7), unit: 'cards' },
    { label: 'All time', value: totalReviews(days), unit: 'cards' },
  ]

  // Month label above the first week of each month (skipped when there's no room to finish it).
  const monthLabels = weeks.map((w, i) => {
    const newMonth = i === 0 || w[0].date.slice(0, 7) !== weeks[i - 1][0].date.slice(0, 7)
    return newMonth && i <= weeks.length - 2 ? fmt(w[0].date, { month: 'short' }) : ''
  })

  return (
    <div className="stack progress-page">
      <h1>Progress</h1>

      <div className="stat-tiles">
        {stats.map((s) => (
          <div key={s.label} className="panel stat-tile">
            <span className="muted">{s.label}</span>
            <span className="stat-value">
              {s.flame && (
                <span className="streak-flame on">
                  <FlameIcon size={22} />
                </span>
              )}
              {s.value} <small className="muted">{s.unit}</small>
            </span>
          </div>
        ))}
      </div>

      <section className="panel stack" aria-labelledby="activity-h">
        <h2 id="activity-h" style={{ fontSize: '1.05rem', margin: 0 }}>
          Activity
        </h2>
        <div className="calendar-fit" ref={fitRef}>
          <div className="calendar" role="img" aria-label={`Study activity for the last ${weekCount} weeks`}>
            <div className="calendar-months" aria-hidden="true">
              {monthLabels.map((m, i) => (
                <span key={i}>{m}</span>
              ))}
            </div>
            <div className="calendar-grid">
              {weeks.map((week, i) => (
                <div key={i} className="calendar-week">
                  {week.map((cell) => (
                    <span
                      key={cell.date}
                      className={`calendar-day l${level(cell.count)} ${cell.future ? 'future' : ''} ${cell.date === today ? 'today' : ''}`}
                      title={cell.future ? '' : `${fmt(cell.date, { month: 'short', day: 'numeric' })}: ${cell.count} card${cell.count === 1 ? '' : 's'}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="calendar-legend muted" aria-hidden="true">
          Less
          {[0, 1, 2, 3, 4].map((l) => (
            <span key={l} className={`calendar-day l${l}`} />
          ))}
          More
        </div>
        {totalReviews(days) === 0 && (
          <p className="muted" style={{ margin: 0 }}>
            Study or practice a deck and your days will start filling in here.
          </p>
        )}
      </section>
    </div>
  )
}
