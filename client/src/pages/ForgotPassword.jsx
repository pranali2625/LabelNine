import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const { resetPassword, loading } = useAuth()
  const [showPass, setShowPass] = useState(false)
  const [form, setForm] = useState({
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  })

  const onChange = (e) => {
    const { name, value } = e.target
    if (name === 'phone') {
      setForm((p) => ({ ...p, phone: value.replace(/\D/g, '').slice(0, 10) }))
      return
    }
    setForm((p) => ({ ...p, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    if (!/^[6-9]\d{9}$/.test(form.phone)) {
      toast.error('Please enter a valid 10-digit mobile number')
      return
    }

    const result = await resetPassword({
      email: form.email,
      phone: form.phone,
      password: form.password
    })
    if (result.success) navigate('/login')
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-[0.2em]">LABEL NINE</h1>
          <p className="text-gray-500 mt-2 text-sm">Reset your password</p>
        </div>

        <div className="bg-white border border-gray-200 p-8">
          <p className="text-sm text-gray-600 mb-6">
            Enter the <strong>email and mobile number</strong> on your account, then choose a new password. No verification code needed.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold tracking-wider text-gray-600 mb-1">EMAIL ADDRESS</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={onChange}
                required
                placeholder="email@example.com"
                className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-black transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold tracking-wider text-gray-600 mb-1">MOBILE NUMBER</label>
              <input
                name="phone"
                type="tel"
                value={form.phone}
                onChange={onChange}
                required
                placeholder="10-digit mobile number"
                className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-black transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold tracking-wider text-gray-600 mb-1">NEW PASSWORD</label>
              <div className="relative">
                <input
                  name="password"
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={onChange}
                  required
                  placeholder="Min 6 characters"
                  className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-black transition-colors pr-10"
                />
                <button type="button" onClick={() => setShowPass((p) => !p)} className="absolute right-3 top-3 text-gray-400 hover:text-black">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold tracking-wider text-gray-600 mb-1">CONFIRM PASSWORD</label>
              <input
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={onChange}
                required
                placeholder="Repeat password"
                className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-black transition-colors"
              />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-black text-white py-3 font-semibold tracking-wide hover:bg-gray-800 transition-colors disabled:opacity-60">
              {loading ? 'Updating...' : 'UPDATE PASSWORD'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-6">
            <Link to="/login" className="font-semibold text-black hover:underline">← Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
