import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { matchesAPI, requestsAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import Avatar from '../components/ui/Avatar'
import { MatchTypeBadge, ProficiencyBadge } from '../components/ui/Badge'
import { StarDisplay } from '../components/ui/StarRating'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import { PageSpinner } from '../components/ui/Spinner'
import toast from 'react-hot-toast'
import { HiLightningBolt, HiRefresh, HiFilter } from 'react-icons/hi'

const TYPE_FILTERS = [
  { id: 'all',      label: 'All Matches' },
  { id: 'exchange', label: '🔄 Exchange' },
  { id: 'learning', label: '🎓 Learning' },
  { id: 'teaching', label: '📖 Teaching' },
  { id: 'practice', label: '🤝 Practice' },
]

const TYPE_DESCRIPTIONS = {
  exchange: 'You can teach each other — a true mutual skill swap.',
  learning: 'This student can teach you a skill you want to learn.',
  teaching: 'This student wants to learn something you can teach.',
  practice: 'You both want to learn the same skill — great practice partners.',
}

const REASON_ICONS = {
  exchange_teach: '📖',
  exchange_learn: '🎓',
  learning:       '🎓',
  teaching:       '📖',
  practice:       '🤝',
}

export default function MatchesPage() {
  const { user } = useAuth()
  const [matches, setMatches]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState('all')
  const [message, setMessage]     = useState('')

  const [reqModal, setReqModal]   = useState({ open: false, target: null })
  const [reqForm, setReqForm]     = useState({ request_type: 'learn', skill_id: '', message: '' })
  const [reqSaving, setReqSaving] = useState(false)

  useEffect(() => { fetchMatches() }, [])

  const fetchMatches = async () => {
    setLoading(true)
    try {
      const res = await matchesAPI.get()
      setMatches(res.data.matches || [])
      if (res.data.message) setMessage(res.data.message)
    } catch {
      toast.error('Failed to load matches.')
    } finally {
      setLoading(false)
    }
  }

  const openReqModal = (match) => {
    setReqModal({ open: true, target: match })
    // Pre-select request type based on match type
    const typeMap = { exchange: 'exchange', learning: 'learn', teaching: 'teach', practice: 'practice' }
    // Pre-fill a relevant skill if available
    const firstSkill = match.user.teaching_skills?.[0]
    setReqForm({
      request_type: typeMap[match.match_type] || 'learn',
      skill_id: firstSkill?.skill_id || '',
      message: buildDefaultMessage(match),
    })
  }

  const buildDefaultMessage = (match) => {
    const firstName = match.user.name.split(' ')[0]
    if (match.match_type === 'exchange') {
      const iTeach = match.reasons.find(r => r.type === 'exchange_teach')
      const theyTeach = match.reasons.find(r => r.type === 'exchange_learn')
      if (iTeach && theyTeach) {
        const mySkill = iTeach.text.split(' teach ')[1]?.split(' and')[0]
        const theirSkill = theyTeach.text.split('teach ')[1]?.split(',')[0]
        return `Hi ${firstName}! I noticed we'd make a great exchange — I can help you with ${mySkill} and I'd love to learn ${theirSkill} from you. Interested?`
      }
    }
    if (match.match_type === 'learning') {
      const reason = match.reasons[0]
      const skill = reason?.text.split('teach ')[1]?.split(' (')[0]?.split(',')[0]
      return `Hi ${firstName}! I'd love to learn ${skill || 'from you'}. Would you be open to a session?`
    }
    if (match.match_type === 'teaching') {
      const reason = match.reasons[0]
      const skill = reason?.text.split('teach ')[1]?.split(' and')[0]
      return `Hi ${firstName}! I saw you want to learn ${skill || 'a skill I can teach'}. I'd be happy to help!`
    }
    if (match.match_type === 'practice') {
      const reason = match.reasons[0]
      const skill = reason?.text.split('learn ')[1]?.split('.')[0]
      return `Hi ${firstName}! Looks like we're both learning ${skill || 'the same skill'}. Want to practise together?`
    }
    return `Hi ${firstName}! I think we'd be a great match. Let's connect!`
  }

  const sendRequest = async () => {
    if (!reqForm.request_type) return toast.error('Select a request type.')
    setReqSaving(true)
    try {
      await requestsAPI.create({
        receiver_id: reqModal.target.user.id,
        skill_id:    reqForm.skill_id || null,
        request_type: reqForm.request_type,
        message:     reqForm.message,
      })
      toast.success('Request sent!')
      setReqModal({ open: false, target: null })
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send request.')
    } finally {
      setReqSaving(false)
    }
  }

  const filtered = filter === 'all' ? matches : matches.filter(m => m.match_type === filter)
  const counts = Object.fromEntries(
    TYPE_FILTERS.map(f => [f.id, f.id === 'all' ? matches.length : matches.filter(m => m.match_type === f.id).length])
  )

  if (loading) return <PageSpinner />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Your Matches</h1>
          <p className="text-slate-500 mt-1">
            Students matched to you based on skills and learning goals.
          </p>
        </div>
        <button onClick={fetchMatches} className="btn-secondary text-sm">
          <HiRefresh className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Stats bar */}
      {matches.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { type: 'exchange', label: 'Exchanges', color: 'bg-amber-50 border-amber-200 text-amber-700' },
            { type: 'learning', label: 'Learning',  color: 'bg-blue-50 border-blue-200 text-blue-700' },
            { type: 'teaching', label: 'Teaching',  color: 'bg-green-50 border-green-200 text-green-700' },
            { type: 'practice', label: 'Practice',  color: 'bg-purple-50 border-purple-200 text-purple-700' },
          ].map(s => (
            <button
              key={s.type}
              onClick={() => setFilter(s.type)}
              className={`border rounded-xl p-3 text-center transition-all ${s.color} ${filter === s.type ? 'ring-2 ring-offset-1 ring-current' : 'opacity-80 hover:opacity-100'}`}
            >
              <p className="text-2xl font-bold">{counts[s.type]}</p>
              <p className="text-xs font-medium mt-0.5">{s.label}</p>
            </button>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {TYPE_FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2
              ${filter === f.id
                ? 'bg-brand-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            {f.label}
            {counts[f.id] > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${filter === f.id ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                {counts[f.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* No skills/goals message */}
      {message && matches.length === 0 && (
        <div className="card p-8 text-center">
          <p className="text-4xl mb-3">⚡</p>
          <p className="font-semibold text-slate-900 mb-1">{message}</p>
          <p className="text-sm text-slate-500 mb-4">Add teaching skills and learning goals to unlock your matches.</p>
          <Link to="/skills" className="btn-primary">Go to My Skills</Link>
        </div>
      )}

      {/* Match list */}
      {matches.length > 0 && filtered.length === 0 && (
        <EmptyState icon="🔍" title={`No ${filter} matches`}
          description="You don't have any matches of this type yet." />
      )}

      <div className="space-y-4">
        {filtered.map(m => (
          <MatchCard
            key={m.user.id}
            match={m}
            onConnect={() => openReqModal(m)}
          />
        ))}
      </div>

      {/* Request modal */}
      <Modal
        isOpen={reqModal.open}
        onClose={() => setReqModal({ open: false, target: null })}
        title={`Connect with ${reqModal.target?.user.name}`}
        size="lg"
      >
        {reqModal.target && (
          <div className="space-y-5">
            {/* Match summary */}
            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
              <Avatar src={reqModal.target.user.avatar_url} name={reqModal.target.user.name} size="md" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-slate-900">{reqModal.target.user.name}</p>
                  <MatchTypeBadge type={reqModal.target.match_type} />
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{reqModal.target.user.university}</p>
                <div className="mt-2 space-y-1">
                  {reqModal.target.reasons.map((r, i) => (
                    <p key={i} className="text-xs text-brand-700 bg-brand-50 px-2 py-1 rounded-lg inline-block mr-1">
                      {REASON_ICONS[r.type] || '✓'} {r.text}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            {/* Request type */}
            <div>
              <label className="label">Request type *</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'learn',    label: '🎓 I want to learn', desc: 'from them' },
                  { value: 'teach',    label: '📖 I want to teach', desc: 'them' },
                  { value: 'exchange', label: '🔄 Exchange',        desc: 'mutual skills' },
                  { value: 'practice', label: '🤝 Practice',        desc: 'together' },
                ].map(t => (
                  <button key={t.value} type="button"
                    onClick={() => setReqForm(p => ({ ...p, request_type: t.value }))}
                    className={`p-3 rounded-xl border text-left transition-colors
                      ${reqForm.request_type === t.value
                        ? 'border-brand-600 bg-brand-50'
                        : 'border-slate-200 hover:border-slate-300'}`}
                  >
                    <p className="text-sm font-medium">{t.label}</p>
                    <p className="text-xs text-slate-500">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Skill selector */}
            {reqModal.target.user.teaching_skills?.length > 0 && (
              <div>
                <label className="label">Skill (optional)</label>
                <select className="input" value={reqForm.skill_id}
                  onChange={e => setReqForm(p => ({ ...p, skill_id: e.target.value }))}>
                  <option value="">Any skill</option>
                  {reqModal.target.user.teaching_skills.map(s => (
                    <option key={s.skill_id} value={s.skill_id}>{s.skill_name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Message */}
            <div>
              <label className="label">Message</label>
              <textarea
                className="input resize-none min-h-[110px]"
                value={reqForm.message}
                onChange={e => setReqForm(p => ({ ...p, message: e.target.value }))}
                placeholder="Introduce yourself and explain what you're looking for…"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setReqModal({ open: false, target: null })} className="btn-secondary flex-1 justify-center">
                Cancel
              </button>
              <button onClick={sendRequest} disabled={reqSaving} className="btn-primary flex-1 justify-center">
                {reqSaving ? 'Sending…' : 'Send Request'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

/* ─── MatchCard ─────────────────────────────────────────────────────────────── */

function MatchCard({ match, onConnect }) {
  const [expanded, setExpanded] = useState(false)
  const { user, match_type, score, reasons } = match

  return (
    <div className="card hover:shadow-md transition-shadow">
      {/* Top row */}
      <div className="p-5 flex items-start gap-4 flex-wrap">
        <Avatar src={user.avatar_url} name={user.name} size="lg" />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-slate-900 text-lg">{user.name}</p>
                <MatchTypeBadge type={match_type} />
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                {user.university}{user.year_of_study ? ` · ${user.year_of_study}` : ''}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <StarDisplay rating={user.average_rating} count={user.rating_count} />
              <p className="text-xs text-slate-500 mt-0.5">{user.completed_sessions} sessions</p>
            </div>
          </div>

          {/* Match type description */}
          <p className="text-sm text-slate-600 mt-2 italic">{TYPE_DESCRIPTIONS[match_type]}</p>

          {/* Reasons */}
          <div className="mt-3 space-y-1.5">
            {reasons.map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="text-base leading-none mt-0.5">{REASON_ICONS[r.type] || '✓'}</span>
                <span className="text-brand-700 font-medium">{r.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Expandable skill pills */}
      {(user.teaching_skills?.length > 0 || user.learning_goals?.length > 0) && (
        <div className="px-5 pb-4 border-t border-slate-50 pt-3">
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-xs text-slate-500 hover:text-slate-700 font-medium mb-3"
          >
            {expanded ? '▲ Hide details' : '▼ Show skills'}
          </button>

          {expanded && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {user.teaching_skills?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Can teach</p>
                  <div className="flex flex-wrap gap-1.5">
                    {user.teaching_skills.map(s => (
                      <span key={s.skill_id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-50 text-violet-700 rounded-full text-xs">
                        {s.skill_name}
                        {s.proficiency && <><span className="text-violet-400">·</span><span className="capitalize">{s.proficiency.slice(0,3)}</span></>}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {user.learning_goals?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Wants to learn</p>
                  <div className="flex flex-wrap gap-1.5">
                    {user.learning_goals.map(s => (
                      <span key={s.skill_id} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">
                        {s.skill_name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="px-5 pb-5 flex gap-2 flex-wrap border-t border-slate-50 pt-3">
        <Link to={`/users/${user.id}`} className="btn-secondary text-sm py-2 flex-1 justify-center">
          View Profile
        </Link>
        <button onClick={onConnect} className="btn-primary text-sm py-2 flex-1 justify-center">
          <HiLightningBolt className="w-4 h-4" /> Connect
        </button>
      </div>
    </div>
  )
}
