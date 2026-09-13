import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { requestsAPI, sessionsAPI, skillsAPI } from '../services/api'
import Avatar from '../components/ui/Avatar'
import { StatusBadge } from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import { PageSpinner } from '../components/ui/Spinner'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { HiCheck, HiX, HiTrash, HiCalendar } from 'react-icons/hi'

export default function RequestsPage() {
  const { user } = useAuth()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('received')
  const [sessionModal, setSessionModal] = useState({ open: false, request: null })
  const [sessionForm, setSessionForm] = useState({
    scheduled_date: '', scheduled_time: '', duration_minutes: 60,
    interaction_type: 'online', location_or_link: '', notes: ''
  })
  const [sessionSaving, setSaving] = useState(false)
  const [allSkills, setAllSkills] = useState([])

  useEffect(() => {
    fetchRequests()
    skillsAPI.getAll().then(r => setAllSkills(r.data.skills || []))
  }, [])

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const res = await requestsAPI.getAll()
      setRequests(res.data.requests || [])
    } catch { toast.error('Failed to fetch requests.') }
    finally { setLoading(false) }
  }

  const handleAccept = async (id) => {
    try {
      await requestsAPI.accept(id)
      toast.success('Request accepted!')
      fetchRequests()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed.') }
  }

  const handleDecline = async (id) => {
    try {
      await requestsAPI.decline(id)
      toast.success('Request declined.')
      fetchRequests()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed.') }
  }

  const handleCancel = async (id) => {
    if (!confirm('Cancel this request?')) return
    try {
      await requestsAPI.cancel(id)
      toast.success('Request cancelled.')
      fetchRequests()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed.') }
  }

  const openSessionModal = (request) => {
    setSessionModal({ open: true, request })
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
    setSessionForm({
      scheduled_date: tomorrow.toISOString().split('T')[0],
      scheduled_time: '14:00',
      duration_minutes: 60,
      interaction_type: 'online',
      location_or_link: '',
      notes: ''
    })
  }

  const proposeSession = async () => {
    if (!sessionForm.scheduled_date || !sessionForm.scheduled_time) {
      return toast.error('Date and time are required.')
    }
    setSaving(true)
    try {
      const req = sessionModal.request
      await sessionsAPI.propose({
        request_id: req.id,
        participant_id: req.sender_id === user.id ? req.receiver_id : req.sender_id,
        skill_id: req.skill_id || null,
        ...sessionForm,
      })
      toast.success('Session proposed!')
      setSessionModal({ open: false, request: null })
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to propose session.')
    } finally { setSaving(false) }
  }

  const tabs = [
    { id: 'received', label: 'Received' },
    { id: 'sent', label: 'Sent' },
    { id: 'accepted', label: 'Accepted' },
  ]

  const filtered = requests.filter(r => {
    if (activeTab === 'received') return r.receiver_id === user.id && r.status === 'pending'
    if (activeTab === 'sent') return r.sender_id === user.id && ['pending', 'cancelled', 'declined'].includes(r.status)
    if (activeTab === 'accepted') return (r.sender_id === user.id || r.receiver_id === user.id) && r.status === 'accepted'
    return false
  })

  const counts = {
    received: requests.filter(r => r.receiver_id === user.id && r.status === 'pending').length,
    sent: requests.filter(r => r.sender_id === user.id && ['pending', 'cancelled', 'declined'].includes(r.status)).length,
    accepted: requests.filter(r => (r.sender_id === user.id || r.receiver_id === user.id) && r.status === 'accepted').length,
  }

  if (loading) return <PageSpinner />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Requests</h1>
        <p className="text-slate-500 mt-1">Manage your learning and exchange requests.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2
              ${activeTab === t.id ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {t.label}
            {counts[t.id] > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === t.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {counts[t.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="📬" title={`No ${activeTab} requests`}
          description={
            activeTab === 'received' ? "When students send you requests, they'll appear here." :
            activeTab === 'sent' ? "You haven't sent any requests yet. Discover students to connect with!" :
            'No accepted requests. Accept requests to schedule sessions.'
          } />
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <RequestCard key={r.id} request={r} currentUser={user}
              onAccept={() => handleAccept(r.id)}
              onDecline={() => handleDecline(r.id)}
              onCancel={() => handleCancel(r.id)}
              onSchedule={() => openSessionModal(r)}
            />
          ))}
        </div>
      )}

      {/* Session Proposal Modal */}
      <Modal isOpen={sessionModal.open} onClose={() => setSessionModal({ open: false, request: null })}
        title="Propose a Session">
        {sessionModal.request && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl text-sm">
              <p className="text-slate-500">
                Proposing session with <strong className="text-slate-900">
                  {sessionModal.request.sender_id === user.id
                    ? sessionModal.request.receiver_name
                    : sessionModal.request.sender_name}
                </strong>
                {sessionModal.request.skill_name && ` for ${sessionModal.request.skill_name}`}
              </p>
            </div>

            {sessionModal.request?.interaction_type === 'in-person' && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl text-amber-800 text-xs">
                <span>⚠️</span>
                <span>For in-person sessions, consider meeting in a public campus location for safety.</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Date *</label>
                <input type="date" className="input" value={sessionForm.scheduled_date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setSessionForm(p => ({ ...p, scheduled_date: e.target.value }))} />
              </div>
              <div>
                <label className="label">Time *</label>
                <input type="time" className="input" value={sessionForm.scheduled_time}
                  onChange={e => setSessionForm(p => ({ ...p, scheduled_time: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Duration</label>
                <select className="input" value={sessionForm.duration_minutes}
                  onChange={e => setSessionForm(p => ({ ...p, duration_minutes: parseInt(e.target.value) }))}>
                  {[30,45,60,90,120].map(d => <option key={d} value={d}>{d} min</option>)}
                </select>
              </div>
              <div>
                <label className="label">Format</label>
                <select className="input" value={sessionForm.interaction_type}
                  onChange={e => setSessionForm(p => ({ ...p, interaction_type: e.target.value }))}>
                  <option value="online">Online</option>
                  <option value="in-person">In-person</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">
                {sessionForm.interaction_type === 'online' ? 'Meeting Link' : 'Location'}
              </label>
              <input type="text" className="input"
                placeholder={sessionForm.interaction_type === 'online' ? 'https://meet.google.com/...' : 'Library Room 204, Campus Café, etc.'}
                value={sessionForm.location_or_link}
                onChange={e => setSessionForm(p => ({ ...p, location_or_link: e.target.value }))} />
            </div>

            {sessionForm.interaction_type === 'in-person' && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl text-amber-800 text-xs">
                <span>⚠️</span>
                <span>Safety reminder: For in-person sessions, consider meeting in a public campus location such as the library or a campus café.</span>
              </div>
            )}

            <div>
              <label className="label">Notes (optional)</label>
              <textarea className="input resize-none min-h-[70px]" placeholder="Any prep notes or agenda…"
                value={sessionForm.notes}
                onChange={e => setSessionForm(p => ({ ...p, notes: e.target.value }))} />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setSessionModal({ open: false, request: null })} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={proposeSession} disabled={sessionSaving} className="btn-primary flex-1 justify-center">
                {sessionSaving ? 'Proposing…' : 'Propose Session'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function RequestCard({ request, currentUser, onAccept, onDecline, onCancel, onSchedule }) {
  const isSender = request.sender_id === currentUser.id
  const otherName = isSender ? request.receiver_name : request.sender_name
  const otherAvatar = isSender ? request.receiver_avatar : request.sender_avatar
  const typeLabels = { learn: '🎓 Learn', teach: '📖 Teach', exchange: '🔄 Exchange', practice: '🤝 Practice' }

  return (
    <div className="card p-5">
      <div className="flex items-start gap-4">
        <Avatar src={otherAvatar} name={otherName} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-slate-900">{otherName}</p>
            <StatusBadge status={request.status} />
            <span className="badge bg-slate-100 text-slate-600">{typeLabels[request.request_type]}</span>
            {request.skill_name && <span className="badge bg-violet-50 text-violet-700">{request.skill_name}</span>}
          </div>
          {request.message && (
            <p className="text-sm text-slate-600 mt-2 italic">"{request.message}"</p>
          )}
          <p className="text-xs text-slate-400 mt-2">
            {isSender ? 'You sent' : `${request.sender_name} sent`} this ·{' '}
            {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-4 flex-wrap">
        {/* Receiver can accept/decline pending */}
        {request.receiver_id === currentUser.id && request.status === 'pending' && (
          <>
            <button onClick={onAccept} className="btn-primary text-sm py-2">
              <HiCheck className="w-4 h-4" /> Accept
            </button>
            <button onClick={onDecline} className="btn-secondary text-sm py-2">
              <HiX className="w-4 h-4" /> Decline
            </button>
          </>
        )}
        {/* Sender can cancel pending */}
        {request.sender_id === currentUser.id && request.status === 'pending' && (
          <button onClick={onCancel} className="btn-ghost text-sm py-2 text-red-600 hover:bg-red-50">
            <HiTrash className="w-4 h-4" /> Cancel Request
          </button>
        )}
        {/* Schedule session on accepted */}
        {request.status === 'accepted' && (
          <button onClick={onSchedule} className="btn-primary text-sm py-2">
            <HiCalendar className="w-4 h-4" /> Propose Session
          </button>
        )}
      </div>
    </div>
  )
}
