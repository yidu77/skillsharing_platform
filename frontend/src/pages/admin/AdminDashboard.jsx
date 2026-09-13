import { useState, useEffect } from 'react'
import { adminAPI } from '../../services/api'
import { PageSpinner } from '../../components/ui/Spinner'
import { HiUsers, HiLightningBolt, HiCalendar, HiInbox, HiFlag, HiTrendingUp } from 'react-icons/hi'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminAPI.getStats().then(r => { setStats(r.data.stats); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <PageSpinner />

  const cards = [
    { label: 'Total Students', value: stats?.total_users ?? 0, icon: HiUsers, color: 'bg-blue-500' },
    { label: 'Active (7d)', value: stats?.active_users_7d ?? 0, icon: HiTrendingUp, color: 'bg-green-500' },
    { label: 'Skills Offered', value: stats?.skills_offered ?? 0, icon: HiLightningBolt, color: 'bg-violet-500' },
    { label: 'Skills Wanted', value: stats?.skills_wanted ?? 0, icon: HiLightningBolt, color: 'bg-indigo-500' },
    { label: 'Completed Sessions', value: stats?.completed_sessions ?? 0, icon: HiCalendar, color: 'bg-emerald-500' },
    { label: 'Pending Requests', value: stats?.pending_requests ?? 0, icon: HiInbox, color: 'bg-amber-500' },
    { label: 'Pending Reports', value: stats?.pending_reports ?? 0, icon: HiFlag, color: 'bg-red-500' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-slate-500 mt-1">Platform overview and statistics</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className={`w-10 h-10 ${c.color} rounded-xl flex items-center justify-center mb-3`}>
              <c.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{c.value.toLocaleString()}</p>
            <p className="text-sm text-slate-500 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
