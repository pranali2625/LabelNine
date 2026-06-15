import { createContext, useContext, useState } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'

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

  const sendRegisterOtp = async ({ name, email, phone, password }) => {
    setLoading(true)
    try {
      const { data } = await api.post('/auth/register/send-otp', { name, email, phone, password })
      toast.success(data.message || 'OTP sent!')
      return {
        success: true,
        verifyChannel: data.verifyChannel,
        destination: data.destination,
        destinations: data.destinations
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send OTP'
      toast.error(msg)
      return { success: false, message: msg }
    } finally {
      setLoading(false)
    }
  }

  const verifyRegisterOtp = async ({ email, phone, otp }) => {
    setLoading(true)
    try {
      const { data } = await api.post('/auth/register/verify', { email, phone, otp })
      saveAuth(data.token, data.user)
      toast.success('Account created!')
      return { success: true, user: data.user }
    } catch (err) {
      const msg = err.response?.data?.message || 'Verification failed'
      toast.error(msg)
      return { success: false, message: msg }
    } finally {
      setLoading(false)
    }
  }

  const resendRegisterOtp = async ({ email, phone }) => {
    try {
      const { data } = await api.post('/auth/register/resend-otp', { email, phone })
      toast.success(data.message || 'OTP resent!')
      return { success: true }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to resend OTP'
      toast.error(msg)
      return { success: false }
    }
  }

  const login = async ({ identifier, password }) => {
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { identifier, password })
      saveAuth(data.token, data.user)
      toast.success(`Welcome back, ${data.user.name}!`)
      return { success: true, user: data.user }
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed'
      toast.error(msg)
      return { success: false }
    } finally {
      setLoading(false)
    }
  }

  const loginWithOtp = async ({ phone, email, otp }) => {
    setLoading(true)
    try {
      const { data } = await api.post('/auth/verify-otp', { phone, email, otp })
      saveAuth(data.token, data.user)
      toast.success('Login successful!')
      return { success: true, user: data.user }
    } catch (err) {
      const msg = err.response?.data?.message || 'OTP verification failed'
      toast.error(msg)
      return { success: false }
    } finally {
      setLoading(false)
    }
  }

  const sendOtp = async ({ phone, email }) => {
    try {
      await api.post('/auth/login-otp', { phone, email })
      toast.success('OTP sent!')
      return { success: true }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send OTP'
      toast.error(msg)
      return { success: false }
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
        sendRegisterOtp,
        verifyRegisterOtp,
        resendRegisterOtp,
        login,
        loginWithOtp,
        sendOtp,
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
