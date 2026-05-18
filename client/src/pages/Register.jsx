import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, CheckCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'

export default function Register() {
  const navigate = useNavigate()
  const { register, loading } = useAuth()

  const [step, setStep] = useState(1) // 1=form, 2=verify OTP
  const [showPass, setShowPass] = useState(false)
  const [otp, setOtp] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')

  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: ''
  })
  const onChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const handleRegister = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    if (!form.email && !form.phone) {
      toast.error('Please provide either email or phone number')
      return
    }
    if (form.phone && !/^[6-9]\d{9}$/.test(form.phone)) {
      toast.error('Please enter a valid 10-digit mobile number')
      return
    }

    const result = await register({
      name: form.name,
      email: form.email || undefined,
      phone: form.phone || undefined,
      password: form.password
    })

    if (result.success) {
      if (form.email) {
        setRegisteredEmail(form.email)
        setStep(2)
      } else {
        navigate('/')
      }
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setVerifying(true)
    try {
      await api.post('/auth/verify-otp', { email: registeredEmail, otp })
      toast.success('Email verified!')
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP')
    } finally {
      setVerifying(false)
    }
  }

  if (step === 2) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h1 className="text-2xl font-bold">Verify Your Email</h1>
            <p className="text-gray-500 text-sm mt-2">
              We sent a 6-digit OTP to <strong>{registeredEmail}</strong>
            </p>
          </div>
          <div className="bg-white border border-gray-200 p-8">
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold tracking-wider text-gray-600 mb-1">ENTER OTP</label>
                <input
                  type="text"
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                  required
                  maxLength={6}
                  placeholder="6-digit OTP"
                  className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-black tracking-widest text-center text-lg transition-colors"
                />
              </div>
              <button type="submit" disabled={verifying} className="w-full bg-black text-white py-3 font-semibold tracking-wide hover:bg-gray-800 transition-colors disabled:opacity-60">
                {verifying ? 'Verifying...' : 'VERIFY EMAIL'}
              </button>
            </form>
            <button onClick={() => navigate('/')} className="block w-full text-center text-sm text-gray-500 hover:text-black mt-4 transition-colors">
              Skip for now →
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-[0.2em]">LABEL NINE</h1>
          <p className="text-gray-500 mt-2 text-sm">Create your account</p>
        </div>

        <div className="bg-white border border-gray-200 p-8">
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold tracking-wider text-gray-600 mb-1">FULL NAME *</label>
              <input name="name" value={form.name} onChange={onChange} required placeholder="Your full name" className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-black transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-semibold tracking-wider text-gray-600 mb-1">EMAIL ADDRESS</label>
              <input name="email" type="email" value={form.email} onChange={onChange} placeholder="email@example.com" className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-black transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-semibold tracking-wider text-gray-600 mb-1">MOBILE NUMBER</label>
              <input name="phone" value={form.phone} onChange={onChange} maxLength={10} placeholder="10-digit mobile number" className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-black transition-colors" />
            </div>
            <p className="text-xs text-gray-500 -mt-2">* Provide at least one: email or mobile</p>
            <div>
              <label className="block text-xs font-semibold tracking-wider text-gray-600 mb-1">PASSWORD *</label>
              <div className="relative">
                <input name="password" type={showPass ? 'text' : 'password'} value={form.password} onChange={onChange} required placeholder="Min 6 characters" className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-black transition-colors pr-10" />
                <button type="button" onClick={() => setShowPass(p => !p)} className="absolute right-3 top-3 text-gray-400 hover:text-black">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold tracking-wider text-gray-600 mb-1">CONFIRM PASSWORD *</label>
              <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={onChange} required placeholder="Repeat password" className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-black transition-colors" />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-black text-white py-3 font-semibold tracking-wide hover:bg-gray-800 transition-colors disabled:opacity-60 mt-2">
              {loading ? 'Creating account...' : 'CREATE ACCOUNT'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-black hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
