import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usersAPI, requestsAPI, reportsAPI } from '../services/api'
import Avatar from '../components/ui/Avatar'
import { ProficiencyBadge, StatusBadge } from '../components/ui/Badge'
import { StarDisplay } from '../components/ui/StarRating'
import Modal from '../components/ui/Modal'
import { PageSpinner } from '../components/ui/Spinner'
import toast from 'react-hot-toast'
import { HiFlag, HiArrowLeft } from 'react-icons/hi'
import { formatDistanceToNow } from 'date-fns'

const REPORT_REASONS = [
  { value: 'inappropriate_behavior', label: 'Inappropriate Behavior' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'spam', label: 'Spam' },
  { value: 'fake_profile', label: 'Fake Profile / Skill' },
  { value: 'no_show', label: 'No-show' },
  { value: 'other', label: 'Other' },
]

export default function ProfilePage() {
  const { id } = useParams()
  const { user: currentUser } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const [requestModal, setRequestModal] = useState(false)
  const [requestForm, setRequestForm] = useState({ request_type: 'learn', skill_id: '', message: '' })
  const [requestSaving, setRequestSaving] = useState(false)

  const [reportModal, setReportModal] = useState(false)
  const [reportForm, setReportForm] = useState({ reason: 'inappropriate_behavior', description: '' })
  const [reportSaving, setReportSaving] = useState(false)

  useEffect(() => { fetchProfile() }, [id])

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const res = await usersAPI.getById(id)
      setProfile(res.data.user)
    } catch (err) {
      toast.error('Profile not found.')
      navigate('/discover')
    } finally { setLoading(false) }
  }

  const sendRequest = async () => {
    if (!requestForm.request_type) return toast.error('Select a request type.')
    setRequestSaving(true)
    try {
      await requestsAPI.create({
        receiver_id: id,
        skill_id: requestForm.skill_id || null,
        request_type: requestForm.request_type,
        message: requestForm.message,
      })
      toast.success('Request sent!')
      setRequestModal(false)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send request.')
    } finally { setRequestSaving(false) }
  }

  const submitReport = async () => {
    if (!reportForm.reason) return toast.error('Select a reason.')
    setReportSaving(true)
    try {
      await reportsAPI.create({ reported_user_id: id, ...reportForm })
      toast.success('Report submitted. Thank you.')
      setReportModal(false)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit report.')
    } finally { setReportSaving(false) }
  }

  if (loading) return <PageSpinner />
  if (!profile) return null

  const isOwn = currentUser.id === id

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm">
        <HiArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Header Card */}
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Avatar src={profile.avatar_url} name={profile.name} size="xl" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{profile.name}</h1>
              <p className="text-slate-500">{profile.university} · {profile.year_of_study} · {profile.major}</p>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <StarDisplay rating={profile.average_rating} count={profile.rating_count} />
                <span className="text-sm text-slate-500">{profile.completed_sessions} sessions completed</span>
                {profile.no_show_count > 0 && (
                  <span className="text-xs text-orange-600">⚠️ {profile.no_show_count} no-show{profile.no_show_count > 1 ? 's' : ''}</span>
                )}
              </div>
              <span className={`text-xs mt-1 inline-block px-2 py-0.5 rounded-full ${
                profile.preferred_interaction === 'online' ? 'bg-blue-50 text-blue-600' :
                profile.preferred_interaction === 'in-person' ? 'bg-green-50 text-green-600' :
                'bg-slate-100 text-slate-600'
              }`}>
                Prefers: {profile.preferred_interaction}
              </span>
            </div>
          </div>

          {!isOwn && (
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => { setRequestModal(true); setRequestForm({ request_type: 'learn', skill_id: '', message: '' }) }}
                className="btn-primary text-sm">
                Connect
              </button>
              <button onClick={() => setReportModal(true)}
                className="btn-ghost text-sm text-red-500 hover:bg-red-50">
                <HiFlag className="w-4 h-4" /> Report
              </button>
            </div>
          )}
        </div>

        {profile.bio && (
          <p className="mt-4 text-slate-600 border-t border-slate-100 pt-4">{profile.bio}</p>
        )}

        {profile.availability_text && (
          <p className="mt-2 text-sm text-slate-500">🕐 {profile.availability_text}</p>
        )}

        {profile.interests?.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium text-slate-700 mb-2">Interests</p>
            <div className="flex flex-wrap gap-2">
              {profile.interests.map(i => (
                <span key={i} className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs">{i}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Teaching Skills */}
        <div className="card p-5">
          <h2 className="font-semibold text-slate-900 mb-4">Can Teach</h2>
          {profile.teaching_skills?.length === 0 ? (
            <p className="text-sm text-slate-400">No teaching skills listed.</p>
          ) : (
            <div className="space-y-2">
              {profile.teaching_skills?.map(s => (
                <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50">
                  <div className="w-8 h-8 bg-violet-100 text-violet-700 rounded-lg flex items-center justify-center text-sm flex-shrink-0">⚡</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-900">{s.name}</p>
                    <p className="text-xs text-slate-500">{s.category_name}</p>
                    {s.description && <p className="text-xs text-slate-600 mt-0.5">{s.description}</p>}
                  </div>
                  <ProficiencyBadge level={s.proficiency} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Learning Goals */}
        <div className="card p-5">
          <h2 className="font-semibold text-slate-900 mb-4">Wants to Learn</h2>
          {profile.learning_goals?.length === 0 ? (
            <p className="text-sm text-slate-400">No learning goals listed.</p>
          ) : (
            <div className="space-y-2">
              {profile.learning_goals?.map(s => (
                <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50">
                  <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center text-sm flex-shrink-0">🎯</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-900">{s.name}</p>
                    <p className="text-xs text-slate-500">{s.category_name}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.priority === 'high' ? 'bg-red-50 text-red-600' : s.priority === 'medium' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                    {s.priority}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Reviews */}
      {profile.recent_reviews?.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold text-slate-900 mb-4">Recent Reviews</h2>
          <div className="space-y-4">
            {profile.recent_reviews.map((r, i) => (
              <div key={i} className="flex gap-3 pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                <Avatar src={r.reviewer_avatar} name={r.reviewer_name} size="sm" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-900">{r.reviewer_name}</p>
                    <StarDisplay rating={r.rating} />
                  </div>
                  {r.comment && <p className="text-sm text-slate-600 mt-1">{r.comment}</p>}
                  <p className="text-xs text-slate-400 mt-1">
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Request Modal */}
      <Modal isOpen={requestModal} onClose={() => setRequestModal(false)}
        title={`Connect with ${profile.name}`}>
        <div className="space-y-4">
          <div>
            <label className="label">What do you want to do?</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'learn', label: '🎓 Learn from them' },
                { value: 'teach', label: '📖 Teach them' },
                { value: 'exchange', label: '🔄 Exchange skills' },
                { value: 'practice', label: '🤝 Practice together' },
              ].map(t => (
                <button key={t.value} type="button" onClick={() => setRequestForm(p => ({ ...p, request_type: t.value }))}
                  className={`p-3 rounded-xl border text-sm font-medium text-left transition-colors
                    ${requestForm.request_type === t.value ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 hover:border-slate-300'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {profile.teaching_skills?.length > 0 && (
            <div>
              <label className="label">Skill (optional)</label>
              <select className="input" value={requestForm.skill_id}
                onChange={e => setRequestForm(p => ({ ...p, skill_id: e.target.value }))}>
                <option value="">Any skill</option>
                {profile.teaching_skills.map(s => <option key={s.skill_id} value={s.skill_id}>{s.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="label">Message (optional)</label>
            <textarea className="input resize-none min-h-[100px]"
              placeholder="Hi! I'd love to learn from you…"
              value={requestForm.message}
              onChange={e => setRequestForm(p => ({ ...p, message: e.target.value }))} />
          </div>

          <div className="flex gap-3">
            <button onClick={() => setRequestModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button onClick={sendRequest} disabled={requestSaving} className="btn-primary flex-1 justify-center">
              {requestSaving ? 'Sending…' : 'Send Request'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Report Modal */}
      <Modal isOpen={reportModal} onClose={() => setReportModal(false)} title="Report User">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Reports are reviewed by our team. Please only report genuine issues.</p>
          <div>
            <label className="label">Reason *</label>
            <select className="input" value={reportForm.reason}
              onChange={e => setReportForm(p => ({ ...p, reason: e.target.value }))}>
              {REPORT_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Description (optional)</label>
            <textarea className="input resize-none min-h-[100px]"
              placeholder="Describe what happened…"
              value={reportForm.description}
              onChange={e => setReportForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setReportModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button onClick={submitReport} disabled={reportSaving} className="btn-danger flex-1 justify-center">
              {reportSaving ? 'Submitting…' : 'Submit Report'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
