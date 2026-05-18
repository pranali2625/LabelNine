import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { User, MapPin, Lock, Package, ChevronRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'

export default function Account() {
  const { user, updateUser } = useAuth()
  const [tab, setTab] = useState('profile')
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '' })
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [saving, setSaving] = useState(false)

  const handleProfileSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { data } = await api.put('/users/profile', { name: form.name, email: form.email || undefined, phone: form.phone || undefined })
      updateUser(data.user)
      toast.success('Profile updated')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordSave = async (e) => {
    e.preventDefault()
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setSaving(true)
    try {
      await api.put('/users/password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword })
      toast.success('Password updated')
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password update failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-bold mb-8">My Account</h1>

      <div className="grid md:grid-cols-4 gap-6">
        {/* Sidebar */}
        <aside className="md:col-span-1">
          <nav className="space-y-1">
            {[
              { id: 'profile', label: 'Profile', icon: User },
              { id: 'password', label: 'Password', icon: Lock }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${tab === id ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
            <Link
              to="/account/orders"
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Package className="w-4 h-4" /> My Orders <ChevronRight className="w-3 h-3 ml-auto" />
            </Link>
          </nav>
        </aside>

        {/* Content */}
        <div className="md:col-span-3">
          {tab === 'profile' && (
            <div className="border border-gray-200 p-6">
              <h2 className="font-bold mb-5 tracking-wide">PROFILE INFORMATION</h2>
              <form onSubmit={handleProfileSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold tracking-wider text-gray-600 mb-1">FULL NAME</label>
                  <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-black transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-semibold tracking-wider text-gray-600 mb-1">EMAIL ADDRESS</label>
                  <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-black transition-colors" />
                  {user?.isEmailVerified && <p className="text-xs text-green-600 mt-1">✓ Verified</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold tracking-wider text-gray-600 mb-1">MOBILE NUMBER</label>
                  <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} maxLength={10} className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-black transition-colors" />
                  {user?.isPhoneVerified && <p className="text-xs text-green-600 mt-1">✓ Verified</p>}
                </div>
                <button type="submit" disabled={saving} className="bg-black text-white px-6 py-3 text-sm font-semibold tracking-wide hover:bg-gray-800 transition-colors disabled:opacity-60">
                  {saving ? 'Saving...' : 'SAVE CHANGES'}
                </button>
              </form>
            </div>
          )}

          {tab === 'password' && (
            <div className="border border-gray-200 p-6">
              <h2 className="font-bold mb-5 tracking-wide">CHANGE PASSWORD</h2>
              <form onSubmit={handlePasswordSave} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-semibold tracking-wider text-gray-600 mb-1">CURRENT PASSWORD</label>
                  <input type="password" value={pwForm.currentPassword} onChange={e => setPwForm(p => ({ ...p, currentPassword: e.target.value }))} required className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-black transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-semibold tracking-wider text-gray-600 mb-1">NEW PASSWORD</label>
                  <input type="password" value={pwForm.newPassword} onChange={e => setPwForm(p => ({ ...p, newPassword: e.target.value }))} required minLength={6} className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-black transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-semibold tracking-wider text-gray-600 mb-1">CONFIRM NEW PASSWORD</label>
                  <input type="password" value={pwForm.confirmPassword} onChange={e => setPwForm(p => ({ ...p, confirmPassword: e.target.value }))} required className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-black transition-colors" />
                </div>
                <button type="submit" disabled={saving} className="bg-black text-white px-6 py-3 text-sm font-semibold tracking-wide hover:bg-gray-800 transition-colors disabled:opacity-60">
                  {saving ? 'Updating...' : 'UPDATE PASSWORD'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
