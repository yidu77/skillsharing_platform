const statusMap = {
  pending: 'badge-pending',
  accepted: 'badge-accepted',
  completed: 'badge-completed',
  declined: 'badge-declined',
  cancelled: 'badge-cancelled',
  no_show: 'badge-no-show',
  proposed: 'badge-proposed',
  confirmed: 'badge-confirmed',
}

const profMap = {
  beginner: 'bg-emerald-50 text-emerald-700',
  intermediate: 'bg-blue-50 text-blue-700',
  advanced: 'bg-violet-50 text-violet-700',
}

const matchMap = {
  exchange: 'bg-amber-50 text-amber-700',
  learning: 'bg-blue-50 text-blue-700',
  teaching: 'bg-green-50 text-green-700',
  practice: 'bg-purple-50 text-purple-700',
}

export function StatusBadge({ status }) {
  const label = status?.replace('_', ' ')
  return <span className={statusMap[status] || 'badge bg-slate-100 text-slate-600'}>{label}</span>
}

export function ProficiencyBadge({ level }) {
  return <span className={`badge ${profMap[level] || 'bg-slate-100 text-slate-600'}`}>{level}</span>
}

export function MatchTypeBadge({ type }) {
  const labels = { exchange: '🔄 Skill Exchange', learning: '🎓 Learning Match', teaching: '📖 Teaching Match', practice: '🤝 Practice Match' }
  return <span className={`badge ${matchMap[type] || 'bg-slate-100 text-slate-600'}`}>{labels[type] || type}</span>
}
