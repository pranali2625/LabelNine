import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ForgotPassword() {
  const { requestPasswordReset, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const result = await requestPasswordReset(email)
    if (result.success) setSent(true)
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-[0.2em]">LABEL NINE</h1>
          <p className="text-gray-500 mt-2 text-sm">Reset your password</p>
        </div>

        <div className="bg-white border border-gray-200 p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-gray-600">
                If an account exists for <strong>{email}</strong>, we've sent a password reset link. Check your inbox and spam folder.
              </p>
              <Link to="/login" className="inline-block text-sm font-semibold text-black hover:underline">
                ← Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-6">
                Enter your email address and we'll send you a link to reset your password.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold tracking-wider text-gray-600 mb-1">EMAIL ADDRESS</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="email@example.com"
                    className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-black transition-colors"
                  />
                </div>
                <button type="submit" disabled={loading} className="w-full bg-black text-white py-3 font-semibold tracking-wide hover:bg-gray-800 transition-colors disabled:opacity-60">
                  {loading ? 'Sending...' : 'SEND RESET LINK'}
                </button>
              </form>
              <p className="text-center text-sm text-gray-500 mt-6">
                <Link to="/login" className="font-semibold text-black hover:underline">← Back to sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
