import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { skillsAPI, matchesAPI, requestsAPI, sessionsAPI, reviewsAPI } from '../services/api'
import Avatar from '../components/ui/Avatar'
import { StatusBadge, MatchTypeBadge } from '../components/ui/Badge'
import { StarDisplay, StarPicker } from '../components/ui/StarRating'
import Modal from '../components/ui/Modal'
import { PageSpinner } from '../components/ui/Spinner'
import { formatDateTime, formatDuration } from '../utils/helpers'
import toast from 'react-hot-toast'
import {
  HiPlus, HiArrowRight, HiStar, HiRefresh
} from 'react-icons/hi'

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading]   = useState(true)
  const [data, setData]         = useState({
    teachingSkills: [], learningGoals: [], matches: [],
    pendingRequests: [], upcomingSessions: [], completedNeedReview: [],
  })

  // Review modal state
  const [reviewModal, setReviewModal] = useState({ open: false, session: null })
  const [reviewForm, setReviewForm]   = useState({ rating: 0, comment: '' })
  const [reviewSaving, setReviewSaving] = useState(false)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [teach, learn, matches, requests, sessions] = await Promise.all([
        skillsAPI.getMyTeaching(),
        skillsAPI.getMyLearning(),
        matchesAPI.get(),
        requestsAPI.getAll(),
        sessionsAPI.getAll(),
      ])

      const allSessions  = sessions.data.sessions || []
      const allRequests  = requests.data.requests || []

      const upcoming = allSessions
        .filter(s => ['proposed', 'confirmed'].includes(s.status))
        .slice(0, 3)

      // Completed sessions where the user hasn't left a review yet
      const completed = allSessions.filter(s => s.status === 'completed')
      const reviewChecks = await Promise.all(
        completed.slice(0, 3).map(s =>
          reviewsAPI.checkReview(s.id)
            .then(r => ({ session: s, has_reviewed: r.data.has_reviewed }))
            .catch(() => ({ session: s, has_reviewed: true })) // assume reviewed on error
        )
      )
      const needReview = reviewChecks
        .filter(r => !r.has_reviewed)
        .map(r => r.session)

      setData({
        teachingSkills:       teach.data.skills   || [],
        learningGoals:        learn.data.skills   || [],
        matches:              (matches.data.matches || []).slice(0, 4),
        pendingRequests:      allRequests.filter(r => r.status === 'pending').slice(0, 4),
        upcomingSessions:     upcoming,
        completedNeedReview:  needReview,
      })
    } catch (err) {
      console.error('Dashboard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const openReview = (session) => {
    setReviewModal({ open: true, session })
    setReviewForm({ rating: 0, comment: '' })
  }

  const submitReview = async () => {
    if (reviewForm.rating === 0) return toast.error('Please select a rating.')
    setReviewSaving(true)
    const s = reviewModal.session
    const revieweeId = s.proposer_id === user.id ? s.participant_id : s.proposer_id
    try {
      await reviewsAPI.create({
        session_id:  s.id,
        reviewee_id: revieweeId,
        rating:      reviewForm.rating,
        comment:     reviewForm.comment,
      })
      toast.success('Review submitted!')
      setReviewModal({ open: false, session: null })
      fetchAll()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit review.')
    } finally {
      setReviewSaving(false)
    }
  }

  if (loading) return <PageSpinner />

  const { teachingSkills, learningGoals, matches, pendingRequests, upcomingSessions, completedNeedReview } = data

  return (
    <div className="space-y-8">
      {/* ── Welcome banner ────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-4">
          <Avatar src={user.avatar_url} name={user.name} size="lg" />
          <div>
            <h1 className="text-2xl font-bold">Welcome back, {user.name.split(' ')[0]}! 👋</h1>
            <p className="text-brand-200 mt-1">
              {user.university || 'University'}{user.major ? ` · ${user.major}` : ''}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-6">
          {[
            { label: 'Sessions Done', value: user.completed_sessions || 0 },
            { label: 'Avg Rating',    value: parseFloat(user.average_rating || 0).toFixed(1) },
            { label: 'No-shows',      value: user.no_show_count || 0 },
          ].map(s => (
            <div key={s.label} className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-brand-200 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Review prompts ─────────────────────────────────────────────────── */}
      {completedNeedReview.length > 0 && (
        <div className="card p-5 border-l-4 border-amber-400">
          <p className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <HiStar className="w-5 h-5 text-amber-400" />
            {completedNeedReview.length === 1
              ? 'You have a session waiting for your review'
              : `${completedNeedReview.length} sessions waiting for your review`}
          </p>
          <div className="space-y-2">
            {completedNeedReview.map(s => {
              const other = s.proposer_id === user.id ? s.participant_name : s.proposer_name
              const otherAvatar = s.proposer_id === user.id ? s.participant_avatar : s.proposer_avatar
              return (
                <div key={s.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <Avatar src={otherAvatar} name={other} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">Session with {other}</p>
                    {s.skill_name && <p className="text-xs text-slate-500">{s.skill_name}</p>}
                  </div>
                  <button onClick={() => openReview(s)} className="btn-primary text-xs py-1.5 px-3">
                    Leave Review
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Quick Actions ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Add a Skill',   icon: '⚡', to: '/skills',   color: 'bg-violet-50 text-violet-700 hover:bg-violet-100' },
          { label: 'Find Someone',  icon: '🔍', to: '/discover',  color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
          { label: 'My Matches',    icon: '🎯', to: '/matches',   color: 'bg-brand-50 text-brand-700 hover:bg-brand-100' },
          { label: 'My Requests',   icon: '📬', to: '/requests',  color: 'bg-amber-50 text-amber-700 hover:bg-amber-100' },
        ].map(a => (
          <Link key={a.to} to={a.to}
            className={`card p-4 flex flex-col items-center gap-2 text-center transition-colors ${a.color}`}>
            <span className="text-2xl">{a.icon}</span>
            <span className="text-sm font-semibold">{a.label}</span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left column ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Recommended Matches */}
          <section className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title mb-0">Recommended Matches</h2>
              <Link to="/matches" className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
                See all <HiArrowRight className="w-4 h-4" />
              </Link>
            </div>
            {matches.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-400 text-sm">Add skills and learning goals to see matches.</p>
                <Link to="/skills" className="btn-primary mt-3 text-sm inline-flex">Add Skills</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {matches.map(m => (
                  <div key={m.user.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <Avatar src={m.user.avatar_url} name={m.user.name} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-slate-900">{m.user.name}</p>
                        <MatchTypeBadge type={m.match_type} />
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{m.user.university}</p>
                      {/* Show up to 2 match reasons */}
                      <div className="mt-1 space-y-0.5">
                        {m.reasons.slice(0, 2).map((r, i) => (
                          <p key={i} className="text-xs text-brand-700 bg-brand-50 px-2 py-0.5 rounded-lg inline-block mr-1">
                            ✓ {r.text}
                          </p>
                        ))}
                      </div>
                    </div>
                    <Link to={`/users/${m.user.id}`} className="btn-secondary text-xs px-3 py-1.5 flex-shrink-0">
                      View
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Pending Requests */}
          <section className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title mb-0">Pending Requests</h2>
              <Link to="/requests" className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
                View all <HiArrowRight className="w-4 h-4" />
              </Link>
            </div>
            {pendingRequests.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-6">No pending requests right now.</p>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map(r => {
                  const isSender  = r.sender_id === user.id
                  const otherName = isSender ? r.receiver_name : r.sender_name
                  const otherAvatar = isSender ? r.receiver_avatar : r.sender_avatar
                  return (
                    <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50">
                      <Avatar src={otherAvatar} name={otherName} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900">
                          {isSender ? `To: ${otherName}` : `From: ${otherName}`}
                        </p>
                        <p className="text-xs text-slate-500">
                          {r.skill_name ? `${r.skill_name} · ` : ''}{r.request_type}
                        </p>
                      </div>
                      {!isSender && (
                        <Link to="/requests" className="text-xs btn-primary py-1 px-2">
                          Reply
                        </Link>
                      )}
                      <StatusBadge status={r.status} />
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>

        {/* ── Right column ────────────────────────────────────────────────── */}
        <div className="space-y-6">

          {/* Teaching Skills */}
          <section className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-900">I Can Teach</h2>
              <Link to="/skills" className="p-1 rounded-lg hover:bg-slate-100 text-brand-600">
                <HiPlus className="w-4 h-4" />
              </Link>
            </div>
            {teachingSkills.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-xs text-slate-400 mb-2">No teaching skills yet.</p>
                <Link to="/skills" className="text-xs text-brand-600 font-medium">Add your first skill →</Link>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {teachingSkills.slice(0, 7).map(s => (
                  <span key={s.id} className="px-2.5 py-1 bg-violet-50 text-violet-700 rounded-full text-xs font-medium">
                    {s.skill_name}
                  </span>
                ))}
                {teachingSkills.length > 7 && (
                  <span className="text-xs text-slate-400 self-center">+{teachingSkills.length - 7}</span>
                )}
              </div>
            )}
          </section>

          {/* Learning Goals */}
          <section className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-900">I Want to Learn</h2>
              <Link to="/skills" className="p-1 rounded-lg hover:bg-slate-100 text-brand-600">
                <HiPlus className="w-4 h-4" />
              </Link>
            </div>
            {learningGoals.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-xs text-slate-400 mb-2">No learning goals yet.</p>
                <Link to="/skills" className="text-xs text-brand-600 font-medium">Add what you want to learn →</Link>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {learningGoals.slice(0, 7).map(s => (
                  <span key={s.id} className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                    {s.skill_name}
                  </span>
                ))}
                {learningGoals.length > 7 && (
                  <span className="text-xs text-slate-400 self-center">+{learningGoals.length - 7}</span>
                )}
              </div>
            )}
          </section>

          {/* Upcoming Sessions */}
          <section className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-900">Upcoming Sessions</h2>
              <Link to="/sessions" className="text-xs text-brand-600 font-medium">View all</Link>
            </div>
            {upcomingSessions.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No upcoming sessions.</p>
            ) : (
              <div className="space-y-3">
                {upcomingSessions.map(s => {
                  const isProposer  = s.proposer_id === user.id
                  const other       = isProposer ? s.participant_name : s.proposer_name
                  const otherAvatar = isProposer ? s.participant_avatar : s.proposer_avatar
                  return (
                    <div key={s.id} className="flex items-center gap-3">
                      <Avatar src={otherAvatar} name={other} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-900 truncate">with {other}</p>
                        <p className="text-xs text-slate-500">
                          {s.skill_name ? `${s.skill_name} · ` : ''}
                          {formatDateTime(s.scheduled_date, s.scheduled_time)}
                        </p>
                      </div>
                      <StatusBadge status={s.status} />
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* ── Review Modal ────────────────────────────────────────────────────── */}
      <Modal isOpen={reviewModal.open} onClose={() => setReviewModal({ open: false, session: null })}
        title="Leave a Review">
        {reviewModal.session && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              How was your session
              {reviewModal.session.skill_name ? ` on ${reviewModal.session.skill_name}` : ''}?
            </p>
            <div>
              <label className="label">Rating *</label>
              <StarPicker value={reviewForm.rating} onChange={v => setReviewForm(p => ({ ...p, rating: v }))} />
            </div>
            <div>
              <label className="label">Written Review (optional)</label>
              <textarea className="input resize-none min-h-[100px]"
                placeholder="Share your experience…"
                value={reviewForm.comment}
                onChange={e => setReviewForm(p => ({ ...p, comment: e.target.value }))} />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setReviewModal({ open: false, session: null })} className="btn-secondary flex-1 justify-center">Skip</button>
              <button onClick={submitReview} disabled={reviewSaving} className="btn-primary flex-1 justify-center">
                {reviewSaving ? 'Submitting…' : 'Submit Review'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
