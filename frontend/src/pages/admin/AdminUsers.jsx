import { useState, useEffect } from 'react'
import { adminAPI } from '../../services/api'
import Avatar from '../../components/ui/Avatar'
import { StarDisplay } from '../../components/ui/StarRating'
import { PageSpinner } from '../../components/ui/Spinner'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    adminAPI.getUsers().then(r => { setUsers(r.data.users || []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const toggleSuspension = async (user) => {
    const action = user.is_suspended ? 'unsuspend' : 'suspend'
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${user.name}?`)) return
    try {
      await adminAPI.toggleSuspension(user.id, { is_suspended: !user.is_suspended })
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_suspended: !u.is_suspended } : u))
      toast.success(`User ${action}ed.`)
    } catch (err) { toast.error(err.response?.data?.error || 'Failed.') }
  }

  const filtered = users.filter(u =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <PageSpinner />

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Users</h1>
        <input type="text" className="border border-slate-200 rounded-xl px-4 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">User</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600 hidden md:table-cell">Role</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600 hidden lg:table-cell">Sessions</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600 hidden lg:table-cell">Rating</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600 hidden xl:table-cell">Joined</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(u => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar src={u.avatar_url} name={u.name} size="sm" />
                    <div>
                      <p className="font-medium text-slate-900">{u.name}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className={`badge ${u.role === 'admin' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-slate-700">{u.completed_sessions}</td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <StarDisplay rating={u.average_rating} />
                </td>
                <td className="px-4 py-3 hidden xl:table-cell text-slate-500 text-xs">
                  {format(new Date(u.created_at), 'MMM d, yyyy')}
                </td>
                <td className="px-4 py-3">
                  <span className={`badge ${u.is_suspended ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {u.is_suspended ? 'Suspended' : 'Active'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {u.role !== 'admin' && (
                    <button
                      onClick={() => toggleSuspension(u)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors
                        ${u.is_suspended
                          ? 'bg-green-50 text-green-700 hover:bg-green-100'
                          : 'bg-red-50 text-red-700 hover:bg-red-100'
                        }`}
                    >
                      {u.is_suspended ? 'Unsuspend' : 'Suspend'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400">No users found.</div>
        )}
      </div>
    </div>
  )
}
