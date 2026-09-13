import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { HiChartBar, HiUsers, HiFlag, HiLightningBolt, HiLogout, HiArrowLeft } from 'react-icons/hi'
import toast from 'react-hot-toast'

const navItems = [
  { to: '/admin', icon: HiChartBar, label: 'Dashboard', end: true },
  { to: '/admin/users', icon: HiUsers, label: 'Users' },
  { to: '/admin/reports', icon: HiFlag, label: 'Reports' },
  { to: '/admin/skills', icon: HiLightningBolt, label: 'Skills' },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
    toast.success('Logged out.')
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-56 bg-slate-900 text-white flex flex-col flex-shrink-0">
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">SB</span>
            </div>
            <div>
              <p className="font-bold text-sm">SkillBridge</p>
              <p className="text-xs text-slate-400">Admin Panel</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors
                 ${isActive ? 'bg-brand-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`
              }
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-slate-800 space-y-1">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors w-full"
          >
            <HiArrowLeft className="w-4 h-4" /> Back to App
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors w-full"
          >
            <HiLogout className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
