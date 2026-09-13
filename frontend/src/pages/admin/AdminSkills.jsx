import { useState, useEffect } from 'react'
import { adminAPI } from '../../services/api'
import { PageSpinner } from '../../components/ui/Spinner'
import toast from 'react-hot-toast'

export default function AdminSkills() {
  const [skills, setSkills] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [newCat, setNewCat] = useState({ name: '', description: '', icon: '' })
  const [savingCat, setSavingCat] = useState(false)

  useEffect(() => {
    adminAPI.getSkills().then(r => { setSkills(r.data.skills || []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const addCategory = async (e) => {
    e.preventDefault()
    if (!newCat.name.trim()) return toast.error('Name required.')
    setSavingCat(true)
    try {
      await adminAPI.createCategory(newCat)
      toast.success('Category created.')
      setNewCat({ name: '', description: '', icon: '' })
    } catch (err) { toast.error(err.response?.data?.error || 'Failed.') }
    finally { setSavingCat(false) }
  }

  const filtered = skills.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()))

  if (loading) return <PageSpinner />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Skills Management</h1>

      {/* Add Category */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900 mb-4">Add Skill Category</h2>
        <form onSubmit={addCategory} className="flex gap-3 flex-wrap">
          <input type="text" placeholder="Category name" value={newCat.name}
            onChange={e => setNewCat(p => ({ ...p, name: e.target.value }))}
            className="border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 min-w-32" />
          <input type="text" placeholder="Icon (emoji)" value={newCat.icon}
            onChange={e => setNewCat(p => ({ ...p, icon: e.target.value }))}
            className="border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-28" />
          <button type="submit" disabled={savingCat}
            className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm hover:bg-slate-800 transition-colors">
            {savingCat ? 'Adding…' : 'Add Category'}
          </button>
        </form>
      </div>

      {/* Skills Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <h2 className="font-semibold text-slate-900 flex-1">All Skills ({filtered.length})</h2>
          <input type="text" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48" />
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Skill</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Category</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Teaching</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Learning</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Type</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(s => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{s.name}</td>
                <td className="px-4 py-3 text-slate-600">{s.category_name || '—'}</td>
                <td className="px-4 py-3 text-right text-slate-700">{s.teach_count}</td>
                <td className="px-4 py-3 text-right text-slate-700">{s.learn_count}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${s.is_custom ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-600'}`}>
                    {s.is_custom ? 'Custom' : 'Standard'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-12 text-slate-400">No skills found.</div>}
      </div>
    </div>
  )
}
