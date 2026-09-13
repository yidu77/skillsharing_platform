import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(form.email, form.password)
      toast.success(`Welcome back, ${user.name}!`)
      navigate(user.role === 'admin' ? '/admin' : '/dashboard')
    } catch (err) {
      const msg = err.response?.data?.error || 'Login failed. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const demoLogin = (email, password) => {
    setForm({ email, password })
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-600 to-brand-800 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold">SB</span>
          </div>
          <span className="text-white font-bold text-xl">SkillBridge</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Learn something.<br />Teach something.<br />Exchange something.
          </h1>
          <p className="text-brand-200 text-lg">
            Connect with fellow students to share skills, learn together, and grow as a community.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Skills Shared', value: '500+' },
            { label: 'Active Students', value: '200+' },
            { label: 'Sessions Completed', value: '150+' },
            { label: 'Universities', value: '5+' },
          ].map(s => (
            <div key={s.label} className="bg-white/10 rounded-xl p-4">
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-brand-200 text-sm">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">SB</span>
            </div>
            <span className="font-bold text-slate-900 text-lg">SkillBridge</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-1">Welcome back</h2>
          <p className="text-slate-500 mb-8">Sign in to your account to continue.</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email" className="input" placeholder="you@university.edu"
                value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                required autoFocus
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password" className="input" placeholder="••••••••"
                value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-600 font-medium hover:text-brand-700">Sign up</Link>
          </p>

          {/* Demo credentials */}
          <div className="mt-8 p-4 bg-slate-50 rounded-2xl">
            <p className="text-xs font-semibold text-slate-600 mb-3 uppercase tracking-wide">Demo Accounts</p>
            <div className="space-y-2">
              {[
                { label: 'Alex Chen (Student)', email: 'alex.chen@university.edu', pw: 'password123' },
                { label: 'Maya Patel (Student)', email: 'maya.patel@university.edu', pw: 'password123' },
                { label: 'Admin', email: 'admin@skillbridge.edu', pw: 'admin123' },
              ].map(d => (
                <button
                  key={d.email}
                  type="button"
                  onClick={() => demoLogin(d.email, d.pw)}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-white border border-transparent hover:border-slate-200 transition-all"
                >
                  <p className="text-xs font-medium text-slate-700">{d.label}</p>
                  <p className="text-xs text-slate-400">{d.email}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
