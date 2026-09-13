import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  HiHome, HiSearch, HiLightningBolt, HiInbox, HiCalendar, HiUser, HiX
} from 'react-icons/hi'
import Avatar from '../ui/Avatar'

const navItems = [
  { to: '/dashboard', icon: HiHome, label: 'Dashboard' },
  { to: '/discover', icon: HiSearch, label: 'Discover' },
  { to: '/skills', icon: HiLightningBolt, label: 'My Skills' },
  { to: '/requests', icon: HiInbox, label: 'Requests' },
  { to: '/sessions', icon: HiCalendar, label: 'Sessions' },
  { to: '/profile', icon: HiUser, label: 'My Profile' },
]

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth()

  return (
    <aside className={`
      fixed lg:static inset-y-0 left-0 z-40
      w-64 bg-white border-r border-slate-100 flex flex-col
      transform transition-transform duration-200
      ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
    `}>
      {/* Logo */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">SB</span>
          </div>
          <span className="font-bold text-slate-900 text-lg">SkillBridge</span>
        </div>
        <button onClick={onClose} className="lg:hidden p-1 rounded-lg hover:bg-slate-100">
          <HiX className="w-5 h-5 text-slate-500" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
               ${isActive
                ? 'bg-brand-50 text-brand-700'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {label}
          </NavLink>
        ))}

        {/* Coming Soon */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 cursor-not-allowed">
          <span className="text-lg">⭕</span>
          <span>Skill Circles</span>
          <span className="ml-auto text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">Soon</span>
        </div>
      </nav>

      {/* User footer */}
      {user && (
        <div className="px-4 py-4 border-t border-slate-100">
          <NavLink to="/profile" className="flex items-center gap-3 hover:bg-slate-50 rounded-xl p-2 transition-colors">
            <Avatar src={user.avatar_url} name={user.name} size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{user.name}</p>
              <p className="text-xs text-slate-500 truncate">{user.university || 'Student'}</p>
            </div>
          </NavLink>
        </div>
      )}
    </aside>
  )
}
