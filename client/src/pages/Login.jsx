import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'
  const { login, sendOtp, loginWithOtp, loading } = useAuth()

  const [mode, setMode] = useState('password') // 'password' | 'otp'
  const [step, setStep] = useState(1) // OTP step: 1=enter phone/email, 2=verify OTP
  const [showPass, setShowPass] = useState(false)

  const [form, setForm] = useState({ identifier: '', password: '', otp: '' })
  const onChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const handlePasswordLogin = async (e) => {
    e.preventDefault()
    const result = await login({ identifier: form.identifier, password: form.password })
    if (result.success) {
      navigate(result.user?.role === 'admin' ? '/admin' : `/${redirect === '/' ? '' : redirect}`)
    }
  }

  const handleSendOtp = async (e) => {
    e.preventDefault()
    const isPhone = /^[6-9]\d{9}$/.test(form.identifier)
    const result = await sendOtp(isPhone ? { phone: form.identifier } : { email: form.identifier })
    if (result.success) setStep(2)
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    const isPhone = /^[6-9]\d{9}$/.test(form.identifier)
    const result = await loginWithOtp(isPhone ? { phone: form.identifier, otp: form.otp } : { email: form.identifier, otp: form.otp })
    if (result.success) {
      navigate(result.user?.role === 'admin' ? '/admin' : `/${redirect === '/' ? '' : redirect}`)
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
          {/* Mode toggle */}
          <div className="flex border border-gray-200 mb-6">
            <button
              onClick={() => { setMode('password'); setStep(1) }}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${mode === 'password' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Password
            </button>
            <button
              onClick={() => { setMode('otp'); setStep(1) }}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${mode === 'otp' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              OTP Login
            </button>
          </div>

          {mode === 'password' && (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
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
                <label className="block text-xs font-semibold tracking-wider text-gray-600 mb-1">PASSWORD</label>
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
          )}

          {mode === 'otp' && step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold tracking-wider text-gray-600 mb-1">EMAIL / PHONE</label>
                <input
                  name="identifier"
                  value={form.identifier}
                  onChange={onChange}
                  required
                  placeholder="Email address or 10-digit phone"
                  className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-black transition-colors"
                />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-black text-white py-3 font-semibold tracking-wide hover:bg-gray-800 transition-colors disabled:opacity-60">
                {loading ? 'Sending OTP...' : 'SEND OTP'}
              </button>
            </form>
          )}

          {mode === 'otp' && step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <p className="text-sm text-gray-600">OTP sent to <strong>{form.identifier}</strong></p>
              <div>
                <label className="block text-xs font-semibold tracking-wider text-gray-600 mb-1">ENTER OTP</label>
                <input
                  name="otp"
                  value={form.otp}
                  onChange={onChange}
                  required
                  maxLength={6}
                  placeholder="6-digit OTP"
                  className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-black tracking-widest text-center text-lg transition-colors"
                />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-black text-white py-3 font-semibold tracking-wide hover:bg-gray-800 transition-colors disabled:opacity-60">
                {loading ? 'Verifying...' : 'VERIFY & LOGIN'}
              </button>
              <button type="button" onClick={() => setStep(1)} className="w-full text-sm text-gray-500 hover:text-black transition-colors">
                ← Change number/email
              </button>
            </form>
          )}

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-black hover:underline">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
