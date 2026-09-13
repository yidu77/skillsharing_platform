import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { skillsAPI, matchesAPI, requestsAPI, sessionsAPI } from '../services/api'
import Avatar from '../components/ui/Avatar'
import { StatusBadge, MatchTypeBadge, ProficiencyBadge } from '../components/ui/Badge'
import { StarDisplay } from '../components/ui/StarRating'
import { PageSpinner } from '../components/ui/Spinner'
import {
  HiLightningBolt, HiSearch, HiPlus, HiInbox, HiCalendar,
  HiStar, HiCheckCircle, HiExclamationCircle, HiArrowRight
} from 'react-icons/hi'
import { format, parseISO } from 'date-fns'

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({
    teachingSkills: [], learningGoals: [], matches: [],
    pendingRequests: [], upcomingSessions: []
  })

  useEffect(() => {
    fetchAll()
  }, [])

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
      const pending = (requests.data.requests || []).filter(r => r.status === 'pending')
      const upcoming = (sessions.data.sessions || [])
        .filter(s => ['proposed', 'confirmed'].includes(s.status))
        .slice(0, 3)
      setData({
        teachingSkills: teach.data.skills || [],
        learningGoals: learn.data.skills || [],
        matches: (matches.data.matches || []).slice(0, 4),
        pendingRequests: pending.slice(0, 4),
        upcomingSessions: upcoming,
      })
    } catch (err) {
      console.error('Dashboard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <PageSpinner />

  const { teachingSkills, learningGoals, matches, pendingRequests, upcomingSessions } = data

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-4">
          <Avatar src={user.avatar_url} name={user.name} size="lg" />
          <div>
            <h1 className="text-2xl font-bold">Welcome back, {user.name.split(' ')[0]}! 👋</h1>
            <p className="text-brand-200 mt-1">{user.university || 'University'} · {user.major || 'Student'}</p>
          </div>
        </div>
        {/* Activity stats */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold">{user.completed_sessions || 0}</p>
            <p className="text-xs text-brand-200 mt-0.5">Sessions Done</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold">{parseFloat(user.average_rating || 0).toFixed(1)}</p>
            <p className="text-xs text-brand-200 mt-0.5">Avg Rating</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold">{user.no_show_count || 0}</p>
            <p className="text-xs text-brand-200 mt-0.5">No-shows</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Add a Skill', icon: '⚡', to: '/skills', color: 'bg-violet-50 text-violet-700 hover:bg-violet-100' },
          { label: 'Find Someone', icon: '🔍', to: '/discover', color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
          { label: 'My Requests', icon: '📬', to: '/requests', color: 'bg-amber-50 text-amber-700 hover:bg-amber-100' },
          { label: 'My Sessions', icon: '📅', to: '/sessions', color: 'bg-green-50 text-green-700 hover:bg-green-100' },
        ].map(a => (
          <Link key={a.to} to={a.to}
            className={`card p-4 flex flex-col items-center gap-2 text-center transition-colors ${a.color}`}>
            <span className="text-2xl">{a.icon}</span>
            <span className="text-sm font-semibold">{a.label}</span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">

          {/* Recommended Matches */}
          <section className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title mb-0">Recommended Matches</h2>
              <Link to="/discover" className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
                See all <HiArrowRight className="w-4 h-4" />
              </Link>
            </div>
            {matches.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-400 text-sm">Add skills and learning goals to see matches.</p>
                <Link to="/skills" className="btn-primary mt-3 text-sm">Add Skills</Link>
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
                      {m.reasons[0] && (
                        <p className="text-xs text-brand-700 mt-1 bg-brand-50 px-2 py-1 rounded-lg inline-block">
                          ✓ {m.reasons[0].text}
                        </p>
                      )}
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
                  const isSender = r.sender_id === user.id
                  return (
                    <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50">
                      <Avatar src={isSender ? r.receiver_avatar : r.sender_avatar}
                        name={isSender ? r.receiver_name : r.sender_name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900">
                          {isSender ? `To: ${r.receiver_name}` : `From: ${r.sender_name}`}
                        </p>
                        <p className="text-xs text-slate-500">{r.skill_name} · {r.request_type}</p>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* My Teaching Skills */}
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
                {teachingSkills.slice(0, 6).map(s => (
                  <span key={s.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-50 text-violet-700 rounded-full text-xs font-medium">
                    {s.skill_name}
                  </span>
                ))}
                {teachingSkills.length > 6 && (
                  <span className="text-xs text-slate-400">+{teachingSkills.length - 6} more</span>
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
                {learningGoals.slice(0, 6).map(s => (
                  <span key={s.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                    {s.skill_name}
                  </span>
                ))}
                {learningGoals.length > 6 && (
                  <span className="text-xs text-slate-400">+{learningGoals.length - 6} more</span>
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
                  const other = s.proposer_id === user.id ? s.participant_name : s.proposer_name
                  const otherAvatar = s.proposer_id === user.id ? s.participant_avatar : s.proposer_avatar
                  return (
                    <div key={s.id} className="flex items-center gap-3">
                      <Avatar src={otherAvatar} name={other} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-900 truncate">with {other}</p>
                        <p className="text-xs text-slate-500">
                          {s.skill_name} · {format(parseISO(s.scheduled_date), 'MMM d')} at {s.scheduled_time?.slice(0,5)}
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
    </div>
  )
}
