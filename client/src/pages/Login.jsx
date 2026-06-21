import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { resolveAuthRedirect } from '../utils/auth'

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'
  const { login, loading } = useAuth()

  const [showPass, setShowPass] = useState(false)
  const [form, setForm] = useState({ identifier: '', password: '' })
  const onChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const registerLink = redirect && redirect !== '/'
    ? `/register?redirect=${encodeURIComponent(redirect)}`
    : '/register'

  const handleSubmit = async (e) => {
    e.preventDefault()
    const result = await login({ identifier: form.identifier, password: form.password })
    if (result.success) {
      navigate(resolveAuthRedirect(redirect, result.user?.role))
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-[0.2em]">LABEL NINE</h1>
          <p className="text-gray-500 mt-2 text-sm">Sign in to your account</p>
        </div>

        <div className="bg-white border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold tracking-wider text-gray-600 mb-1">EMAIL / PHONE</label>
              <input
                name="identifier"
                value={form.identifier}
                onChange={onChange}
                required
                placeholder="Email address or phone number"
                className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-black transition-colors"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold tracking-wider text-gray-600">PASSWORD</label>
                <Link to="/forgot-password" className="text-xs text-gray-500 hover:text-black transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  name="password"
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={onChange}
                  required
                  placeholder="Password"
                  className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-black transition-colors pr-10"
                />
                <button type="button" onClick={() => setShowPass(p => !p)} className="absolute right-3 top-3 text-gray-400 hover:text-black">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-black text-white py-3 font-semibold tracking-wide hover:bg-gray-800 transition-colors disabled:opacity-60">
              {loading ? 'Signing in...' : 'SIGN IN'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link to={registerLink} className="font-semibold text-black hover:underline">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
