import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { usersAPI, requestsAPI, skillsAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import Avatar from '../components/ui/Avatar'
import { ProficiencyBadge } from '../components/ui/Badge'
import { StarDisplay } from '../components/ui/StarRating'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import { PageSpinner } from '../components/ui/Spinner'
import toast from 'react-hot-toast'
import { HiSearch, HiAdjustments, HiX } from 'react-icons/hi'

const INTERACTION_TYPES = [
  { value: 'all', label: 'Any format' },
  { value: 'online', label: 'Online' },
  { value: 'in-person', label: 'In-person' },
]

const INTENT_TABS = [
  { id: 'all', label: '🌐 Everyone', desc: 'Browse all students' },
  { id: 'learn', label: '🎓 I want to learn', desc: 'Find students who can teach you' },
  { id: 'teach', label: '📖 I want to teach', desc: 'Find students who want your skills' },
  { id: 'exchange', label: '🔄 I want to exchange', desc: 'Find mutual skill exchange partners' },
  { id: 'practice', label: '🤝 I want to practice', desc: 'Find co-learners' },
]

export default function DiscoverPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [interaction, setInteraction] = useState('all')
  const [activeIntent, setActiveIntent] = useState('all')
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('')

  const [requestModal, setRequestModal] = useState({ open: false, targetUser: null })
  const [requestForm, setRequestForm] = useState({ request_type: 'learn', skill_id: '', message: '' })
  const [requestLoading, setRequestLoading] = useState(false)
  const [targetSkills, setTargetSkills] = useState([])

  useEffect(() => { skillsAPI.getCategories().then(r => setCategories(r.data.categories || [])) }, [])

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (search) params.search = search
      if (interaction !== 'all') params.interaction = interaction
      if (selectedCategory) params.category = selectedCategory
      const res = await usersAPI.getAll(params)
      setUsers(res.data.users || [])
    } catch (err) {
      toast.error('Failed to load students.')
    } finally {
      setLoading(false)
    }
  }, [search, interaction, selectedCategory])

  useEffect(() => {
    const timer = setTimeout(fetchUsers, 300)
    return () => clearTimeout(timer)
  }, [fetchUsers])

  const openRequestModal = async (targetUser) => {
    setRequestModal({ open: true, targetUser })
    setRequestForm({ request_type: 'learn', skill_id: '', message: '' })
    setTargetSkills(targetUser.teaching_skills || [])
  }

  const submitRequest = async () => {
    if (!requestForm.request_type) return toast.error('Select a request type.')
    setRequestLoading(true)
    try {
      await requestsAPI.create({
        receiver_id: requestModal.targetUser.id,
        skill_id: requestForm.skill_id || null,
        request_type: requestForm.request_type,
        message: requestForm.message,
      })
      toast.success('Request sent!')
      setRequestModal({ open: false, targetUser: null })
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send request.')
    } finally {
      setRequestLoading(false)
    }
  }

  const filterByIntent = (usersArr) => {
    if (activeIntent === 'all') return usersArr
    if (activeIntent === 'learn') return usersArr.filter(u => u.teaching_skills?.length > 0)
    if (activeIntent === 'teach') return usersArr.filter(u => u.learning_goals?.length > 0)
    if (activeIntent === 'exchange') return usersArr.filter(u => u.teaching_skills?.length > 0 && u.learning_goals?.length > 0)
    if (activeIntent === 'practice') return usersArr.filter(u => u.learning_goals?.length > 0)
    return usersArr
  }

  const filtered = filterByIntent(users)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Discover Students</h1>
        <p className="text-slate-500 mt-1">Find fellow students to learn from, teach, or exchange skills with.</p>
      </div>

      {/* Intent tabs */}
      <div className="flex flex-wrap gap-2">
        {INTENT_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveIntent(tab.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors
              ${activeIntent === tab.id
                ? 'bg-brand-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-48 relative">
          <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text" placeholder="Search by name, skill, or bio…"
            className="input pl-9" value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="input w-auto" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
          <option value="">All categories</option>
          {categories.map(c => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
        </select>
        <select className="input w-auto" value={interaction} onChange={e => setInteraction(e.target.value)}>
          {INTERACTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        {(search || selectedCategory || interaction !== 'all') && (
          <button onClick={() => { setSearch(''); setSelectedCategory(''); setInteraction('all') }}
            className="btn-ghost text-sm">
            <HiX className="w-4 h-4" /> Clear
          </button>
        )}
      </div>

      <p className="text-sm text-slate-500">{filtered.length} student{filtered.length !== 1 ? 's' : ''} found</p>

      {loading ? <PageSpinner /> : filtered.length === 0 ? (
        <EmptyState icon="🔍" title="No students found"
          description="Try adjusting your search filters or check back later as more students join." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(u => (
            <StudentCard key={u.id} student={u} currentUser={user} onRequest={() => openRequestModal(u)} />
          ))}
        </div>
      )}

      {/* Request Modal */}
      <Modal
        isOpen={requestModal.open}
        onClose={() => setRequestModal({ open: false, targetUser: null })}
        title={`Send Request to ${requestModal.targetUser?.name}`}
      >
        {requestModal.targetUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <Avatar src={requestModal.targetUser.avatar_url} name={requestModal.targetUser.name} />
              <div>
                <p className="font-medium text-slate-900">{requestModal.targetUser.name}</p>
                <p className="text-xs text-slate-500">{requestModal.targetUser.university}</p>
              </div>
            </div>

            <div>
              <label className="label">Request Type *</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'learn', label: '🎓 I want to learn', desc: 'from them' },
                  { value: 'teach', label: '📖 I want to teach', desc: 'them' },
                  { value: 'exchange', label: '🔄 Exchange', desc: 'mutual skills' },
                  { value: 'practice', label: '🤝 Practice', desc: 'together' },
                ].map(t => (
                  <button key={t.value} type="button"
                    onClick={() => setRequestForm(p => ({ ...p, request_type: t.value }))}
                    className={`p-3 rounded-xl border text-left transition-colors ${requestForm.request_type === t.value
                      ? 'border-brand-600 bg-brand-50' : 'border-slate-200 hover:border-slate-300'}`}
                  >
                    <p className="text-sm font-medium">{t.label}</p>
                    <p className="text-xs text-slate-500">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {targetSkills.length > 0 && (
              <div>
                <label className="label">Skill (optional)</label>
                <select className="input" value={requestForm.skill_id}
                  onChange={e => setRequestForm(p => ({ ...p, skill_id: e.target.value }))}>
                  <option value="">Select a skill</option>
                  {targetSkills.map(s => (
                    <option key={s.skill_id} value={s.skill_id}>{s.skill_name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="label">Message (optional)</label>
              <textarea className="input min-h-[100px] resize-none" placeholder="Hi! I'd love to learn from you…"
                value={requestForm.message}
                onChange={e => setRequestForm(p => ({ ...p, message: e.target.value }))}
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setRequestModal({ open: false, targetUser: null })} className="btn-secondary flex-1 justify-center">
                Cancel
              </button>
              <button onClick={submitRequest} disabled={requestLoading} className="btn-primary flex-1 justify-center">
                {requestLoading ? 'Sending…' : 'Send Request'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function StudentCard({ student, currentUser, onRequest }) {
  return (
    <div className="card p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <Avatar src={student.avatar_url} name={student.name} size="md" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900">{student.name}</p>
          <p className="text-xs text-slate-500 truncate">{student.university} · {student.year_of_study}</p>
          <div className="flex items-center gap-2 mt-1">
            <StarDisplay rating={student.average_rating} count={student.rating_count} />
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500">{student.completed_sessions} sessions</span>
          </div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
          student.preferred_interaction === 'online' ? 'bg-blue-50 text-blue-600' :
          student.preferred_interaction === 'in-person' ? 'bg-green-50 text-green-600' :
          'bg-slate-50 text-slate-600'
        }`}>
          {student.preferred_interaction}
        </span>
      </div>

      {student.bio && (
        <p className="text-sm text-slate-600 line-clamp-2">{student.bio}</p>
      )}

      {student.teaching_skills?.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1.5">Can teach</p>
          <div className="flex flex-wrap gap-1.5">
            {student.teaching_skills.slice(0, 4).map(s => (
              <span key={s.skill_id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-50 text-violet-700 rounded-full text-xs">
                {s.skill_name}
                <span className="text-violet-400">·</span>
                <span className="text-violet-500 capitalize">{s.proficiency?.slice(0,3)}</span>
              </span>
            ))}
            {student.teaching_skills.length > 4 && (
              <span className="text-xs text-slate-400">+{student.teaching_skills.length - 4}</span>
            )}
          </div>
        </div>
      )}

      {student.learning_goals?.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1.5">Wants to learn</p>
          <div className="flex flex-wrap gap-1.5">
            {student.learning_goals.slice(0, 4).map(s => (
              <span key={s.skill_id} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">
                {s.skill_name}
              </span>
            ))}
            {student.learning_goals.length > 4 && (
              <span className="text-xs text-slate-400">+{student.learning_goals.length - 4}</span>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-1 border-t border-slate-50">
        <Link to={`/users/${student.id}`} className="btn-secondary flex-1 justify-center text-sm py-2">
          View Profile
        </Link>
        <button onClick={onRequest} className="btn-primary flex-1 justify-center text-sm py-2">
          Connect
        </button>
      </div>
    </div>
  )
}
