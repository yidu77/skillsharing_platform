import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns'

// ─── Date / Time ─────────────────────────────────────────────────────────────

/**
 * Safely parse a date string or Date object.
 * Returns null if the value is falsy or unparseable.
 */
export const safeParseDate = (value) => {
  if (!value) return null
  try {
    const d = typeof value === 'string' ? parseISO(value) : new Date(value)
    return isValid(d) ? d : null
  } catch {
    return null
  }
}

/** Format a date string as "MMM d, yyyy" — returns '—' on null/invalid. */
export const formatDate = (value, fmt = 'MMM d, yyyy') => {
  const d = safeParseDate(value)
  return d ? format(d, fmt) : '—'
}

/** Format a time string "HH:MM:SS" or "HH:MM" as "h:mm a". */
export const formatTime = (timeStr) => {
  if (!timeStr) return '—'
  try {
    const [h, m] = timeStr.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const hour = h % 12 || 12
    return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
  } catch {
    return timeStr
  }
}

/** Format a date + time pair together. */
export const formatDateTime = (dateStr, timeStr) => {
  const d = formatDate(dateStr, 'EEE, MMM d')
  const t = formatTime(timeStr)
  if (d === '—') return '—'
  return `${d} at ${t}`
}

/** "3 hours ago", "2 days ago" etc. */
export const timeAgo = (value) => {
  const d = safeParseDate(value)
  return d ? formatDistanceToNow(d, { addSuffix: true }) : '—'
}

/** Duration in minutes → human label: "30 min", "1 h", "1 h 30 min". */
export const formatDuration = (minutes) => {
  if (!minutes) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${m} min`
}

// ─── Numbers / Text ───────────────────────────────────────────────────────────

/** Round a rating to 1 decimal place; return '—' if zero/null. */
export const formatRating = (rating) => {
  const r = parseFloat(rating)
  if (!r || isNaN(r)) return '—'
  return r.toFixed(1)
}

/** Capitalise first letter of a string. */
export const capitalise = (str) => {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/** Truncate a string to maxLen characters, appending '…'. */
export const truncate = (str, maxLen = 120) => {
  if (!str) return ''
  return str.length <= maxLen ? str : str.slice(0, maxLen).trimEnd() + '…'
}

// ─── Request / Session helpers ────────────────────────────────────────────────

export const REQUEST_TYPE_LABELS = {
  learn: '🎓 Learn',
  teach: '📖 Teach',
  exchange: '🔄 Exchange',
  practice: '🤝 Practice',
}

export const MATCH_TYPE_META = {
  exchange: { emoji: '🔄', label: 'Skill Exchange', color: 'bg-amber-50 text-amber-700' },
  learning: { emoji: '🎓', label: 'Learning Match', color: 'bg-blue-50 text-blue-700' },
  teaching: { emoji: '📖', label: 'Teaching Match', color: 'bg-green-50 text-green-700' },
  practice: { emoji: '🤝', label: 'Practice Match', color: 'bg-purple-50 text-purple-700' },
}

export const STATUS_COLORS = {
  pending:   'bg-amber-100 text-amber-700',
  accepted:  'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  declined:  'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-600',
  no_show:   'bg-orange-100 text-orange-700',
  proposed:  'bg-violet-100 text-violet-700',
  confirmed: 'bg-green-100 text-green-700',
}

export const PROFICIENCY_COLORS = {
  beginner:     'bg-emerald-50 text-emerald-700',
  intermediate: 'bg-blue-50 text-blue-700',
  advanced:     'bg-violet-50 text-violet-700',
}

/** Get the "other participant" from a session relative to the current user. */
export const getSessionOther = (session, userId) => {
  const isProposer = session.proposer_id === userId
  return {
    id: isProposer ? session.participant_id : session.proposer_id,
    name: isProposer ? session.participant_name : session.proposer_name,
    avatar: isProposer ? session.participant_avatar : session.proposer_avatar,
    isProposer,
  }
}
