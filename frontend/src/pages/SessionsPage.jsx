import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { sessionsAPI, reviewsAPI } from '../services/api'
import Avatar from '../components/ui/Avatar'
import { StatusBadge } from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import { PageSpinner } from '../components/ui/Spinner'
import { StarPicker } from '../components/ui/StarRating'
import toast from 'react-hot-toast'
import { format, parseISO } from 'date-fns'
import { HiCheck, HiX, HiStar, HiVideoCamera, HiLocationMarker, HiClock } from 'react-icons/hi'

export default function SessionsPage() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('upcoming')

  const [reviewModal, setReviewModal] = useState({ open: false, session: null })
  const [reviewForm, setReviewForm] = useState({ rating: 0, comment: '' })
  const [reviewSaving, setReviewSaving] = useState(false)

  const [counterModal, setCounterModal] = useState({ open: false, session: null })
  const [counterForm, setCounterForm] = useState({ counter_date: '', counter_time: '', counter_notes: '' })

  useEffect(() => { fetchSessions() }, [])

  const fetchSessions = async () => {
    setLoading(true)
    try {
      const res = await sessionsAPI.getAll()
      setSessions(res.data.sessions || [])
    } catch { toast.error('Failed to load sessions.') }
    finally { setLoading(false) }
  }

  const handleConfirm = async (id) => {
    try {
      await sessionsAPI.confirm(id)
      toast.success('Session confirmed!')
      fetchSessions()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed.') }
  }

  const handleComplete = async (id) => {
    try {
      await sessionsAPI.complete(id)
      toast.success('Marked as completed. Leave a review!')
      fetchSessions()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed.') }
  }

  const handleCancel = async (id) => {
    if (!confirm('Cancel this session?')) return
    try {
      await sessionsAPI.cancel(id)
      toast.success('Session cancelled.')
      fetchSessions()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed.') }
  }

  const handleNoShow = async (id) => {
    if (!confirm('Mark this as a no-show? This will affect the other person\'s reliability score.')) return
    try {
      await sessionsAPI.noShow(id)
      toast.success('Marked as no-show.')
      fetchSessions()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed.') }
  }

  const openReview = async (session) => {
    try {
      const res = await reviewsAPI.checkReview(session.id)
      if (res.data.has_reviewed) return toast('You already reviewed this session.', { icon: 'ℹ️' })
      setReviewModal({ open: true, session })
      setReviewForm({ rating: 0, comment: '' })
    } catch { toast.error('Failed to check review status.') }
  }

  const submitReview = async () => {
    if (reviewForm.rating === 0) return toast.error('Please select a rating.')
    setReviewSaving(true)
    const s = reviewModal.session
    const revieweeId = s.proposer_id === user.id ? s.participant_id : s.proposer_id
    try {
      await reviewsAPI.create({
        session_id: s.id,
        reviewee_id: revieweeId,
        rating: reviewForm.rating,
        comment: reviewForm.comment,
      })
      toast.success('Review submitted! Thank you.')
      setReviewModal({ open: false, session: null })
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit review.')
    } finally { setReviewSaving(false) }
  }

  const openCounter = (session) => {
    setCounterModal({ open: true, session })
    setCounterForm({ counter_date: session.scheduled_date, counter_time: session.scheduled_time?.slice(0,5) || '', counter_notes: '' })
  }

  const submitCounter = async () => {
    if (!counterForm.counter_date || !counterForm.counter_time) return toast.error('Date and time required.')
    try {
      await sessionsAPI.counter(counterModal.session.id, counterForm)
      toast.success('Counter-proposal sent!')
      setCounterModal({ open: false, session: null })
      fetchSessions()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed.') }
  }

  const tabFilters = {
    upcoming: s => ['proposed', 'confirmed'].includes(s.status),
    completed: s => s.status === 'completed',
    cancelled: s => ['cancelled', 'no_show'].includes(s.status),
  }

  const filtered = sessions.filter(tabFilters[activeTab] || (() => true))
  const counts = Object.fromEntries(Object.entries(tabFilters).map(([k, fn]) => [k, sessions.filter(fn).length]))

  if (loading) return <PageSpinner />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Sessions</h1>
        <p className="text-slate-500 mt-1">Track your scheduled and completed learning sessions.</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'upcoming', label: '📅 Upcoming' },
          { id: 'completed', label: '✅ Completed' },
          { id: 'cancelled', label: '❌ Cancelled' },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2
              ${activeTab === t.id ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {t.label}
            {counts[t.id] > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === t.id ? 'bg-white/20' : 'bg-slate-100 text-slate-600'}`}>
                {counts[t.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={activeTab === 'upcoming' ? '📅' : activeTab === 'completed' ? '✅' : '❌'}
          title={`No ${activeTab} sessions`}
          description={activeTab === 'upcoming'
            ? 'Accept a request and propose a session to get started.'
            : `No ${activeTab} sessions yet.`
          } />
      ) : (
        <div className="space-y-4">
          {filtered.map(s => (
            <SessionCard key={s.id} session={s} currentUser={user}
              onConfirm={() => handleConfirm(s.id)}
              onComplete={() => handleComplete(s.id)}
              onCancel={() => handleCancel(s.id)}
              onNoShow={() => handleNoShow(s.id)}
              onReview={() => openReview(s)}
              onCounter={() => openCounter(s)}
            />
          ))}
        </div>
      )}

      {/* Review Modal */}
      <Modal isOpen={reviewModal.open} onClose={() => setReviewModal({ open: false, session: null })}
        title="Leave a Review">
        {reviewModal.session && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              How was your session{reviewModal.session.skill_name ? ` on ${reviewModal.session.skill_name}` : ''}?
            </p>
            <div>
              <label className="label">Rating *</label>
              <StarPicker value={reviewForm.rating} onChange={v => setReviewForm(p => ({ ...p, rating: v }))} />
            </div>
            <div>
              <label className="label">Written Review (optional)</label>
              <textarea className="input resize-none min-h-[100px]"
                placeholder="Share your experience with this student…"
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

      {/* Counter Modal */}
      <Modal isOpen={counterModal.open} onClose={() => setCounterModal({ open: false, session: null })}
        title="Suggest a Different Time">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">New Date</label>
              <input type="date" className="input" value={counterForm.counter_date}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => setCounterForm(p => ({ ...p, counter_date: e.target.value }))} />
            </div>
            <div>
              <label className="label">New Time</label>
              <input type="time" className="input" value={counterForm.counter_time}
                onChange={e => setCounterForm(p => ({ ...p, counter_time: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Note (optional)</label>
            <textarea className="input resize-none min-h-[70px]"
              placeholder="Reason for the change…"
              value={counterForm.counter_notes}
              onChange={e => setCounterForm(p => ({ ...p, counter_notes: e.target.value }))} />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setCounterModal({ open: false, session: null })} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button onClick={submitCounter} className="btn-primary flex-1 justify-center">Send Proposal</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function SessionCard({ session, currentUser, onConfirm, onComplete, onCancel, onNoShow, onReview, onCounter }) {
  const isProposer = session.proposer_id === currentUser.id
  const otherName = isProposer ? session.participant_name : session.proposer_name
  const otherAvatar = isProposer ? session.participant_avatar : session.proposer_avatar
  const otherId = isProposer ? session.participant_id : session.proposer_id

  const myCompleted = isProposer ? session.proposer_completed : session.participant_completed

  return (
    <div className="card p-5">
      <div className="flex items-start gap-4 flex-wrap">
        <Avatar src={otherAvatar} name={otherName} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-slate-900">Session with {otherName}</p>
            <StatusBadge status={session.status} />
          </div>
          {session.skill_name && (
            <p className="text-sm text-brand-600 font-medium mt-0.5">{session.skill_name}</p>
          )}

          <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-600">
            <span className="flex items-center gap-1.5">
              <HiClock className="w-4 h-4 text-slate-400" />
              {session.scheduled_date ? format(parseISO(session.scheduled_date), 'MMM d, yyyy') : '—'}
              {' at '}{session.scheduled_time?.slice(0,5)}
              {' · '}{session.duration_minutes} min
            </span>
            <span className="flex items-center gap-1.5">
              {session.interaction_type === 'online'
                ? <><HiVideoCamera className="w-4 h-4 text-slate-400" /> Online</>
                : <><HiLocationMarker className="w-4 h-4 text-slate-400" /> In-person</>
              }
            </span>
          </div>

          {session.location_or_link && (
            <div className="mt-2 text-sm text-slate-500 truncate">
              📍 {session.location_or_link.startsWith('http')
                ? <a href={session.location_or_link} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">{session.location_or_link}</a>
                : session.location_or_link
              }
            </div>
          )}
          {session.notes && <p className="text-xs text-slate-500 mt-1">📝 {session.notes}</p>}

          {/* Counter proposal indicator */}
          {session.counter_date && session.status === 'proposed' && !isProposer && (
            <div className="mt-2 p-2 bg-amber-50 rounded-lg text-xs text-amber-700">
              Counter-proposal: {format(parseISO(session.counter_date), 'MMM d')} at {session.counter_time?.slice(0,5)}
              {session.counter_notes && ` · ${session.counter_notes}`}
            </div>
          )}

          {/* Completion status */}
          {session.status !== 'completed' && (session.proposer_completed || session.participant_completed) && (
            <p className="text-xs text-slate-500 mt-2">
              {session.proposer_completed && session.participant_completed
                ? '✅ Both marked complete'
                : myCompleted
                  ? '⏳ Waiting for the other participant to confirm completion'
                  : '⏳ The other participant marked this complete — confirm yours'
              }
            </p>
          )}

          {/* In-person safety note */}
          {session.interaction_type === 'in-person' && ['proposed','confirmed'].includes(session.status) && (
            <p className="text-xs text-amber-600 mt-2 bg-amber-50 px-2 py-1 rounded-lg">
              ⚠️ For in-person sessions, consider meeting in a public campus location.
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-4 flex-wrap border-t border-slate-50 pt-4">
        {/* Participant confirms proposed session */}
        {!isProposer && session.status === 'proposed' && (
          <>
            <button onClick={onConfirm} className="btn-primary text-sm py-2">
              <HiCheck className="w-4 h-4" /> Confirm
            </button>
            <button onClick={onCounter} className="btn-secondary text-sm py-2">
              Suggest Another Time
            </button>
          </>
        )}
        {/* Both can complete */}
        {['confirmed', 'proposed'].includes(session.status) && !myCompleted && (
          <button onClick={onComplete} className="btn-primary text-sm py-2">
            <HiCheck className="w-4 h-4" /> Mark Completed
          </button>
        )}
        {/* Cancel */}
        {['proposed', 'confirmed'].includes(session.status) && (
          <button onClick={onCancel} className="btn-ghost text-sm py-2 text-red-600 hover:bg-red-50">
            Cancel
          </button>
        )}
        {/* No-show */}
        {['confirmed', 'proposed'].includes(session.status) && (
          <button onClick={onNoShow} className="btn-ghost text-sm py-2 text-orange-600 hover:bg-orange-50">
            No-show
          </button>
        )}
        {/* Review */}
        {session.status === 'completed' && (
          <button onClick={onReview} className="btn-secondary text-sm py-2">
            <HiStar className="w-4 h-4" /> Leave Review
          </button>
        )}
      </div>
    </div>
  )
}
