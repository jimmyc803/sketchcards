import { Link } from 'react-router-dom'
import { useData } from '../data/store'
import { todayLocal } from '../srs/scheduler'
import { currentStreak, lastNDays, totalReviews } from '../stats/streak'
import { FlameIcon } from './icons'

/** One quiet line: streak + this week's cards, linking to the Progress page. */
export default function StreakLine() {
  const days = useData((s) => s.reviewDays)
  if (totalReviews(days) === 0) return null
  const today = todayLocal()
  const streak = currentStreak(days, today)
  const week = lastNDays(days, today, 7)
  const studiedToday = (days[today] ?? 0) > 0
  return (
    <Link to="/progress" className="streak-line">
      <span className={`streak-flame ${streak ? 'on' : ''}`}>
        <FlameIcon />
      </span>
      {streak ? (
        <span>
          <b>{streak}-day streak</b>
          {!studiedToday && <span className="muted"> · study today to keep it going</span>}
        </span>
      ) : (
        <span>
          <b>Start a new streak today</b>
        </span>
      )}
      <span className="muted">· {week} cards this week</span>
      <span className="streak-more muted">Progress →</span>
    </Link>
  )
}
