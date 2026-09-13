import { useState, useEffect } from 'react'
import { skillsAPI } from '../services/api'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import { ProficiencyBadge } from '../components/ui/Badge'
import { PageSpinner } from '../components/ui/Spinner'
import toast from 'react-hot-toast'
import { HiPlus, HiPencil, HiTrash, HiLightningBolt, HiAcademicCap } from 'react-icons/hi'

const PROFICIENCY_OPTIONS = ['beginner', 'intermediate', 'advanced']
const PRIORITY_OPTIONS = ['low', 'medium', 'high']

export default function MySkillsPage() {
  const [teachingSkills, setTeachingSkills] = useState([])
  const [learningGoals, setLearningGoals] = useState([])
  const [allSkills, setAllSkills] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('teaching')

  const [addModal, setAddModal] = useState({ open: false, type: null })
  const [editModal, setEditModal] = useState({ open: false, item: null, type: null })
  const [skillSearch, setSkillSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [form, setForm] = useState({ skill_id: '', skill_name: '', proficiency: 'intermediate', priority: 'medium', description: '', notes: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [teach, learn, skills, cats] = await Promise.all([
        skillsAPI.getMyTeaching(),
        skillsAPI.getMyLearning(),
        skillsAPI.getAll(),
        skillsAPI.getCategories(),
      ])
      setTeachingSkills(teach.data.skills || [])
      setLearningGoals(learn.data.skills || [])
      setAllSkills(skills.data.skills || [])
      setCategories(cats.data.categories || [])
    } catch { toast.error('Failed to load skills.') }
    finally { setLoading(false) }
  }

  const filteredSkills = allSkills.filter(s => {
    const matchSearch = !skillSearch || s.name.toLowerCase().includes(skillSearch.toLowerCase())
    const matchCat = !selectedCategory || s.category_id === parseInt(selectedCategory)
    return matchSearch && matchCat
  })

  const openAdd = (type) => {
    setAddModal({ open: true, type })
    setForm({ skill_id: '', skill_name: '', proficiency: 'intermediate', priority: 'medium', description: '', notes: '' })
    setSkillSearch('')
    setSelectedCategory('')
  }

  const handleAdd = async () => {
    if (!form.skill_id && !form.skill_name.trim()) return toast.error('Select or enter a skill.')
    setSaving(true)
    try {
      if (addModal.type === 'teaching') {
        await skillsAPI.addTeaching({
          skill_id: form.skill_id || undefined,
          skill_name: form.skill_name || undefined,
          proficiency: form.proficiency,
          description: form.description,
        })
        toast.success('Skill added to your teaching list!')
      } else {
        await skillsAPI.addLearning({
          skill_id: form.skill_id || undefined,
          skill_name: form.skill_name || undefined,
          priority: form.priority,
          notes: form.notes,
        })
        toast.success('Skill added to your learning goals!')
      }
      setAddModal({ open: false, type: null })
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add skill.')
    } finally { setSaving(false) }
  }

  const handleEdit = async () => {
    setSaving(true)
    try {
      if (editModal.type === 'teaching') {
        await skillsAPI.updateTeaching(editModal.item.id, {
          proficiency: form.proficiency,
          description: form.description,
        })
        toast.success('Skill updated.')
      }
      setEditModal({ open: false, item: null, type: null })
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update skill.')
    } finally { setSaving(false) }
  }

  const handleRemove = async (id, type) => {
    if (!confirm('Remove this skill?')) return
    try {
      if (type === 'teaching') await skillsAPI.removeTeaching(id)
      else await skillsAPI.removeLearning(id)
      toast.success('Skill removed.')
      fetchData()
    } catch { toast.error('Failed to remove skill.') }
  }

  const openEdit = (item, type) => {
    setEditModal({ open: true, item, type })
    setForm({ proficiency: item.proficiency || 'intermediate', description: item.description || '', priority: item.priority || 'medium', notes: item.notes || '' })
  }

  if (loading) return <PageSpinner />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">My Skills</h1>
          <p className="text-slate-500 mt-1">Manage what you can teach and what you want to learn.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'teaching', label: '⚡ I Can Teach', count: teachingSkills.length },
          { id: 'learning', label: '🎯 I Want to Learn', count: learningGoals.length },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2
              ${activeTab === t.id ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {t.label}
            <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === t.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Teaching Skills */}
      {activeTab === 'teaching' && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="section-title mb-0">Skills I Can Teach</h2>
            <button onClick={() => openAdd('teaching')} className="btn-primary text-sm">
              <HiPlus className="w-4 h-4" /> Add Skill
            </button>
          </div>
          {teachingSkills.length === 0 ? (
            <EmptyState icon="⚡" title="No teaching skills yet"
              description="Add skills you can share with other students."
              action={<button onClick={() => openAdd('teaching')} className="btn-primary">Add Your First Skill</button>} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {teachingSkills.map(s => (
                <div key={s.id} className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
                  <div className="w-8 h-8 bg-violet-100 text-violet-700 rounded-lg flex items-center justify-center flex-shrink-0 text-sm">
                    {s.icon || '⚡'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-slate-900">{s.skill_name}</p>
                      <ProficiencyBadge level={s.proficiency} />
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{s.category_name}</p>
                    {s.description && <p className="text-xs text-slate-600 mt-1">{s.description}</p>}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(s, 'teaching')} className="p-1.5 rounded-lg hover:bg-white text-slate-500 hover:text-brand-600 transition-colors">
                      <HiPencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleRemove(s.id, 'teaching')} className="p-1.5 rounded-lg hover:bg-white text-slate-500 hover:text-red-600 transition-colors">
                      <HiTrash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Learning Goals */}
      {activeTab === 'learning' && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="section-title mb-0">Skills I Want to Learn</h2>
            <button onClick={() => openAdd('learning')} className="btn-primary text-sm">
              <HiPlus className="w-4 h-4" /> Add Goal
            </button>
          </div>
          {learningGoals.length === 0 ? (
            <EmptyState icon="🎯" title="No learning goals yet"
              description="Tell others what you want to learn so they can find you."
              action={<button onClick={() => openAdd('learning')} className="btn-primary">Add Learning Goal</button>} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {learningGoals.map(s => (
                <div key={s.id} className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
                  <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center flex-shrink-0 text-sm">
                    🎯
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-slate-900">{s.skill_name}</p>
                      <span className={`badge text-xs ${s.priority === 'high' ? 'bg-red-50 text-red-600' : s.priority === 'medium' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                        {s.priority} priority
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{s.category_name}</p>
                    {s.notes && <p className="text-xs text-slate-600 mt-1">{s.notes}</p>}
                  </div>
                  <button onClick={() => handleRemove(s.id, 'learning')} className="p-1.5 rounded-lg hover:bg-white text-slate-500 hover:text-red-600 transition-colors flex-shrink-0">
                    <HiTrash className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Skill Modal */}
      <Modal isOpen={addModal.open} onClose={() => setAddModal({ open: false, type: null })}
        title={addModal.type === 'teaching' ? 'Add a Skill You Can Teach' : 'Add a Learning Goal'}>
        <div className="space-y-4">
          <div>
            <label className="label">Category</label>
            <select className="input" value={selectedCategory} onChange={e => { setSelectedCategory(e.target.value); setForm(p => ({ ...p, skill_id: '' })) }}>
              <option value="">All categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Search Skill</label>
            <input className="input" placeholder="Search or type a custom skill…"
              value={skillSearch} onChange={e => { setSkillSearch(e.target.value); setForm(p => ({ ...p, skill_name: e.target.value, skill_id: '' })) }} />
          </div>
          {filteredSkills.length > 0 && skillSearch && (
            <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl">
              {filteredSkills.slice(0, 15).map(s => (
                <button key={s.id} type="button" onClick={() => { setForm(p => ({ ...p, skill_id: s.id, skill_name: s.name })); setSkillSearch(s.name) }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-brand-50 flex items-center justify-between
                    ${form.skill_id === s.id ? 'bg-brand-50 text-brand-700' : 'text-slate-700'}`}>
                  <span>{s.name}</span>
                  <span className="text-xs text-slate-400">{s.category_name}</span>
                </button>
              ))}
            </div>
          )}

          {addModal.type === 'teaching' && (
            <>
              <div>
                <label className="label">Proficiency</label>
                <div className="grid grid-cols-3 gap-2">
                  {PROFICIENCY_OPTIONS.map(p => (
                    <button key={p} type="button" onClick={() => setForm(f => ({ ...f, proficiency: p }))}
                      className={`py-2 rounded-xl border text-sm font-medium transition-colors capitalize
                        ${form.proficiency === p ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Description (optional)</label>
                <textarea className="input resize-none min-h-[70px]" placeholder="Briefly describe your experience…"
                  value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>
            </>
          )}

          {addModal.type === 'learning' && (
            <>
              <div>
                <label className="label">Priority</label>
                <div className="grid grid-cols-3 gap-2">
                  {PRIORITY_OPTIONS.map(p => (
                    <button key={p} type="button" onClick={() => setForm(f => ({ ...f, priority: p }))}
                      className={`py-2 rounded-xl border text-sm font-medium transition-colors capitalize
                        ${form.priority === p ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Notes (optional)</label>
                <textarea className="input resize-none min-h-[70px]" placeholder="Why do you want to learn this?"
                  value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </>
          )}

          <div className="flex gap-3">
            <button onClick={() => setAddModal({ open: false, type: null })} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button onClick={handleAdd} disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? 'Saving…' : 'Add Skill'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={editModal.open} onClose={() => setEditModal({ open: false, item: null, type: null })}
        title={`Edit: ${editModal.item?.skill_name}`}>
        <div className="space-y-4">
          {editModal.type === 'teaching' && (
            <>
              <div>
                <label className="label">Proficiency</label>
                <div className="grid grid-cols-3 gap-2">
                  {PROFICIENCY_OPTIONS.map(p => (
                    <button key={p} type="button" onClick={() => setForm(f => ({ ...f, proficiency: p }))}
                      className={`py-2 rounded-xl border text-sm font-medium capitalize
                        ${form.proficiency === p ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input resize-none min-h-[80px]"
                  value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>
            </>
          )}
          <div className="flex gap-3">
            <button onClick={() => setEditModal({ open: false, item: null, type: null })} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button onClick={handleEdit} disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
