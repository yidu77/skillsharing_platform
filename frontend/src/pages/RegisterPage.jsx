import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '', email: '', password: '', university: '', year_of_study: '', major: ''
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const set = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})
    setLoading(true)
    try {
      await register(form)
      toast.success('Account created! Welcome to SkillBridge 🎉')
      navigate('/dashboard')
    } catch (err) {
      if (err.response?.data?.errors) {
        const errs = {}
        err.response.data.errors.forEach(e => { errs[e.path] = e.msg })
        setErrors(errs)
      } else {
        setErrors({ general: err.response?.data?.error || 'Registration failed. Please try again.' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 w-full max-w-lg p-8">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">SB</span>
          </div>
          <span className="font-bold text-slate-900 text-lg">SkillBridge</span>
        </div>

        <h2 className="text-2xl font-bold text-slate-900 mb-1">Create your account</h2>
        <p className="text-slate-500 mb-8">Join your university's skill sharing community.</p>

        {errors.general && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-6 text-sm">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Full Name *</label>
            <input type="text" className={`input ${errors.name ? 'border-red-400' : ''}`}
              placeholder="Your full name" value={form.name} onChange={set('name')} required />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="label">University Email *</label>
            <input type="email" className={`input ${errors.email ? 'border-red-400' : ''}`}
              placeholder="you@university.edu" value={form.email} onChange={set('email')} required />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="label">Password *</label>
            <input type="password" className={`input ${errors.password ? 'border-red-400' : ''}`}
              placeholder="At least 6 characters" value={form.password} onChange={set('password')} required />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">University</label>
              <input type="text" className="input" placeholder="State University"
                value={form.university} onChange={set('university')} />
            </div>
            <div>
              <label className="label">Year of Study</label>
              <select className="input" value={form.year_of_study} onChange={set('year_of_study')}>
                <option value="">Select year</option>
                {['1st Year','2nd Year','3rd Year','4th Year','Postgraduate','PhD','Staff'].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Major / Field of Study</label>
            <input type="text" className="input" placeholder="Computer Science, Design, etc."
              value={form.major} onChange={set('major')} />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-600 font-medium hover:text-brand-700">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
