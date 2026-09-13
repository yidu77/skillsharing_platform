import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('sb_token')
    if (!token) { setLoading(false); return }
    try {
      const res = await authAPI.me()
      setUser(res.data.user)
    } catch {
      localStorage.removeItem('sb_token')
      localStorage.removeItem('sb_user')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadUser() }, [loadUser])

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password })
    const { user, token } = res.data
    localStorage.setItem('sb_token', token)
    localStorage.setItem('sb_user', JSON.stringify(user))
    setUser(user)
    return user
  }

  const register = async (data) => {
    const res = await authAPI.register(data)
    const { user, token } = res.data
    localStorage.setItem('sb_token', token)
    localStorage.setItem('sb_user', JSON.stringify(user))
    setUser(user)
    return user
  }

  const logout = async () => {
    try { await authAPI.logout() } catch { /* ignore */ }
    localStorage.removeItem('sb_token')
    localStorage.removeItem('sb_user')
    setUser(null)
  }

  const updateUser = (updates) => {
    setUser(prev => {
      const updated = { ...prev, ...updates }
      localStorage.setItem('sb_user', JSON.stringify(updated))
      return updated
    })
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, loadUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
