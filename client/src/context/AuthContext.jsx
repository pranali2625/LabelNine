import { createContext, useContext, useState } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'
import { normalizeLoginIdentifier, normalizePhone } from '../utils/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('ln_user')
    return stored ? JSON.parse(stored) : null
  })
  const [loading, setLoading] = useState(false)

  const saveAuth = (token, userData) => {
    localStorage.setItem('ln_token', token)
    localStorage.setItem('ln_user', JSON.stringify(userData))
    setUser(userData)
  }

  const register = async ({ name, email, phone, password }) => {
    setLoading(true)
    try {
      const { data } = await api.post('/auth/register', {
        name: String(name || '').trim(),
        email: String(email || '').trim(),
        phone: normalizePhone(phone),
        password
      })
      saveAuth(data.token, data.user)
      toast.success('Account created!')
      return { success: true, user: data.user }
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed'
      toast.error(msg)
      return { success: false, message: msg }
    } finally {
      setLoading(false)
    }
  }

  const login = async ({ identifier, password }) => {
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', {
        identifier: normalizeLoginIdentifier(identifier),
        password
      })
      saveAuth(data.token, data.user)
      toast.success(`Welcome back, ${data.user.name}!`)
      return { success: true, user: data.user }
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed'
      toast.error(msg, { id: 'auth-login-error' })
      return { success: false }
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async ({ email, phone, password }) => {
    setLoading(true)
    try {
      const { data } = await api.post('/auth/reset-password', {
        email: String(email || '').trim(),
        phone: normalizePhone(phone),
        password
      })
      toast.success(data.message || 'Password updated!')
      return { success: true }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to reset password'
      toast.error(msg)
      return { success: false }
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('ln_token')
    localStorage.removeItem('ln_user')
    setUser(null)
    toast.success('Logged out')
  }

  const updateUser = (updates) => {
    const updated = { ...user, ...updates }
    localStorage.setItem('ln_user', JSON.stringify(updated))
    setUser(updated)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        register,
        login,
        resetPassword,
        logout,
        updateUser,
        isAdmin: user?.role === 'admin'
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
