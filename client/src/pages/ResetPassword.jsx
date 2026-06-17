import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const { resetPassword, loading } = useAuth()

  const [showPass, setShowPass] = useState(false)
  const [form, setForm] = useState({ password: '', confirmPassword: '' })
  const onChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!token) {
      toast.error('Invalid reset link')
      return
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    const result = await resetPassword({ token, password: form.password })
    if (result.success) navigate('/login')
  }

  if (!token) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <p className="text-gray-600 mb-4">This reset link is invalid or has expired.</p>
          <Link to="/forgot-password" className="font-semibold text-black hover:underline">Request a new link</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-[0.2em]">LABEL NINE</h1>
          <p className="text-gray-500 mt-2 text-sm">Choose a new password</p>
        </div>

        <div className="bg-white border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
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
                <button type="button" onClick={() => setShowPass(p => !p)} className="absolute right-3 top-3 text-gray-400 hover:text-black">
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
        </div>
      </div>
    </div>
  )
}
