import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { usersAPI } from '../services/api'
import Avatar from '../components/ui/Avatar'
import { StarDisplay } from '../components/ui/StarRating'
import { ProficiencyBadge } from '../components/ui/Badge'
import { PageSpinner } from '../components/ui/Spinner'
import toast from 'react-hot-toast'
import { HiPencil, HiCheck, HiX } from 'react-icons/hi'

const INTERACTION_OPTIONS = ['online', 'in-person', 'both']

export default function MyProfilePage() {
  const { user, updateUser } = useAuth()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchProfile() }, [])

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const res = await usersAPI.getById(user.id)
      setProfile(res.data.user)
      const p = res.data.user
      setForm({
        name: p.name || '',
        bio: p.bio || '',
        university: p.university || '',
        year_of_study: p.year_of_study || '',
        major: p.major || '',
        availability_text: p.availability_text || '',
        preferred_interaction: p.preferred_interaction || 'both',
      })
    } catch { toast.error('Failed to load profile.') }
    finally { setLoading(false) }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await usersAPI.update(user.id, form)
      updateUser(res.data.user)
      setProfile(p => ({ ...p, ...res.data.user }))
      setEditing(false)
      toast.success('Profile updated!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update profile.')
    } finally { setSaving(false) }
  }

  if (loading) return <PageSpinner />
  if (!profile) return null

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">My Profile</h1>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="btn-secondary text-sm">
            <HiPencil className="w-4 h-4" /> Edit Profile
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="btn-secondary text-sm">
              <HiX className="w-4 h-4" /> Cancel
            </button>
            <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">
              <HiCheck className="w-4 h-4" /> {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {/* Profile Card */}
      <div className="card p-6">
        <div className="flex items-start gap-4">
          <div className="relative">
            <Avatar src={profile.avatar_url} name={profile.name} size="xl" />
          </div>
          <div className="flex-1">
            {editing ? (
              <input type="text" className="input text-xl font-bold mb-2"
                value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            ) : (
              <h2 className="text-xl font-bold text-slate-900">{profile.name}</h2>
            )}
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <StarDisplay rating={profile.average_rating} count={profile.rating_count} />
              <span className="text-sm text-slate-500">{profile.completed_sessions} sessions</span>
              {profile.no_show_count > 0 && (
                <span className="text-xs text-orange-600">⚠️ {profile.no_show_count} no-show{profile.no_show_count > 1 ? 's' : ''}</span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="label">Bio</label>
            {editing ? (
              <textarea className="input resize-none min-h-[90px]"
                placeholder="Tell others about yourself…"
                value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} />
            ) : (
              <p className="text-slate-600 text-sm">{profile.bio || <span className="text-slate-400 italic">No bio yet. Click Edit to add one.</span>}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">University</label>
              {editing ? (
                <input type="text" className="input" value={form.university}
                  onChange={e => setForm(p => ({ ...p, university: e.target.value }))} />
              ) : (
                <p className="text-sm text-slate-700">{profile.university || '—'}</p>
              )}
            </div>
            <div>
              <label className="label">Year</label>
              {editing ? (
                <select className="input" value={form.year_of_study}
                  onChange={e => setForm(p => ({ ...p, year_of_study: e.target.value }))}>
                  {['', '1st Year','2nd Year','3rd Year','4th Year','Postgraduate','PhD','Staff'].map(y => (
                    <option key={y} value={y}>{y || 'Select…'}</option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-slate-700">{profile.year_of_study || '—'}</p>
              )}
            </div>
            <div>
              <label className="label">Major</label>
              {editing ? (
                <input type="text" className="input" value={form.major}
                  onChange={e => setForm(p => ({ ...p, major: e.target.value }))} />
              ) : (
                <p className="text-sm text-slate-700">{profile.major || '—'}</p>
              )}
            </div>
            <div>
              <label className="label">Preferred Format</label>
              {editing ? (
                <select className="input" value={form.preferred_interaction}
                  onChange={e => setForm(p => ({ ...p, preferred_interaction: e.target.value }))}>
                  {INTERACTION_OPTIONS.map(o => <option key={o} value={o} className="capitalize">{o}</option>)}
                </select>
              ) : (
                <p className="text-sm text-slate-700 capitalize">{profile.preferred_interaction || '—'}</p>
              )}
            </div>
          </div>

          <div>
            <label className="label">Availability</label>
            {editing ? (
              <input type="text" className="input" placeholder="e.g. Weekday evenings and weekends"
                value={form.availability_text}
                onChange={e => setForm(p => ({ ...p, availability_text: e.target.value }))} />
            ) : (
              <p className="text-sm text-slate-700">{profile.availability_text || <span className="text-slate-400 italic">Not specified</span>}</p>
            )}
          </div>
        </div>
      </div>

      {/* Skills summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900">Can Teach</h3>
            <a href="/skills" className="text-xs text-brand-600">Manage →</a>
          </div>
          {profile.teaching_skills?.length === 0 ? (
            <p className="text-xs text-slate-400">No teaching skills yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {profile.teaching_skills?.map(s => (
                <span key={s.id} className="inline-flex items-center gap-1 px-2 py-1 bg-violet-50 text-violet-700 rounded-full text-xs">
                  {s.name} · <span className="capitalize">{s.proficiency?.slice(0,3)}</span>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900">Wants to Learn</h3>
            <a href="/skills" className="text-xs text-brand-600">Manage →</a>
          </div>
          {profile.learning_goals?.length === 0 ? (
            <p className="text-xs text-slate-400">No learning goals yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {profile.learning_goals?.map(s => (
                <span key={s.id} className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">{s.name}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reviews */}
      {profile.recent_reviews?.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 mb-4">Recent Reviews</h3>
          <div className="space-y-3">
            {profile.recent_reviews.map((r, i) => (
              <div key={i} className="flex gap-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                <Avatar src={r.reviewer_avatar} name={r.reviewer_name} size="sm" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{r.reviewer_name}</p>
                    <StarDisplay rating={r.rating} />
                  </div>
                  {r.comment && <p className="text-sm text-slate-600 mt-1">{r.comment}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
