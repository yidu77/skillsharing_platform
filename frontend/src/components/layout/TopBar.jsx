import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { notificationsAPI } from '../../services/api'
import { HiMenu, HiBell, HiLogout } from 'react-icons/hi'
import Avatar from '../ui/Avatar'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'

export default function TopBar({ onMenuClick }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread] = useState(0)
  const notifRef = useRef(null)

  useEffect(() => {
    if (user) fetchNotifications()
  }, [user])

  useEffect(() => {
    const handle = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const fetchNotifications = async () => {
    try {
      const res = await notificationsAPI.getAll()
      setNotifications(res.data.notifications || [])
      setUnread(res.data.unread_count || 0)
    } catch { /* ignore */ }
  }

  const handleNotifOpen = async () => {
    setNotifOpen(o => !o)
    if (!notifOpen && unread > 0) {
      try {
        await notificationsAPI.markAllRead()
        setUnread(0)
        setNotifications(n => n.map(x => ({ ...x, is_read: true })))
      } catch { /* ignore */ }
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
    toast.success('Logged out successfully.')
  }

  return (
    <header className="bg-white border-b border-slate-100 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-20">
      <button onClick={onMenuClick} className="lg:hidden p-2 rounded-lg hover:bg-slate-100">
        <HiMenu className="w-5 h-5 text-slate-600" />
      </button>

      <div className="flex-1 lg:flex-none" />

      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={handleNotifOpen}
            className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-600"
          >
            <HiBell className="w-5 h-5" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="font-semibold text-slate-900">Notifications</p>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-center text-sm text-slate-500 py-8">No notifications yet.</p>
                ) : notifications.map(n => (
                  <div key={n.id} className={`px-4 py-3 border-b border-slate-50 ${!n.is_read ? 'bg-brand-50' : ''}`}>
                    <p className="text-sm font-medium text-slate-900">{n.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-100">
          <Avatar src={user?.avatar_url} name={user?.name} size="sm" />
          <span className="hidden md:block text-sm font-medium text-slate-700">{user?.name}</span>
          <button onClick={handleLogout} className="p-2 rounded-xl hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors" title="Logout">
            <HiLogout className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
