import { useEffect, useState } from 'react'
import { Search, UserCheck, UserX } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [toggling, setToggling] = useState(null)

  const fetchUsers = (q = '') => {
    setLoading(true)
    const params = new URLSearchParams({ limit: 50 })
    if (q) params.append('search', q)
    api.get(`/admin/users?${params}`)
      .then(res => setUsers(res.data.users))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchUsers() }, [])

  const handleToggle = async (userId, isActive) => {
    setToggling(userId)
    try {
      await api.patch(`/admin/users/${userId}/status`, { isActive: !isActive })
      toast.success(`User ${!isActive ? 'activated' : 'deactivated'}`)
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, isActive: !isActive } : u))
    } catch {
      toast.error('Failed to update user status')
    } finally {
      setToggling(null)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Users ({users.length})</h2>

      <div className="flex gap-2 mb-6 max-w-sm">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && fetchUsers(search)}
          placeholder="Search by name, email, phone..."
          className="flex-1 border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-black"
        />
        <button onClick={() => fetchUsers(search)} className="bg-black text-white px-3 py-2 hover:bg-gray-800 transition-colors">
          <Search className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="space-y-2 animate-pulse">{[...Array(6)].map((_, i) => <div key={i} className="bg-white border h-14" />)}</div>
      ) : (
        <div className="bg-white border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-xs tracking-wider">USER</th>
                <th className="text-left px-4 py-3 font-semibold text-xs tracking-wider">CONTACT</th>
                <th className="text-left px-4 py-3 font-semibold text-xs tracking-wider">JOINED</th>
                <th className="text-left px-4 py-3 font-semibold text-xs tracking-wider">VERIFIED</th>
                <th className="text-left px-4 py-3 font-semibold text-xs tracking-wider">ROLE</th>
                <th className="text-left px-4 py-3 font-semibold text-xs tracking-wider">STATUS</th>
                <th className="text-left px-4 py-3 font-semibold text-xs tracking-wider">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user._id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {user.name?.charAt(0).toUpperCase()}
                      </div>
                      <p className="font-medium">{user.name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {user.email && <p>{user.email}</p>}
                    {user.phone && <p>{user.phone}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {new Date(user.createdAt).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {user.isEmailVerified && (
                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">Email</span>
                      )}
                      {user.isPhoneVerified && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">Phone</span>
                      )}
                      {!user.isEmailVerified && !user.isPhoneVerified && (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {user.role !== 'admin' && (
                      <button
                        onClick={() => handleToggle(user._id, user.isActive)}
                        disabled={toggling === user._id}
                        className={`p-1.5 rounded transition-colors disabled:opacity-50 ${user.isActive ? 'hover:bg-red-50 text-red-500' : 'hover:bg-green-50 text-green-600'}`}
                        title={user.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {user.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <div className="text-center py-12 text-gray-500 text-sm">No users found</div>
          )}
        </div>
      )}
    </div>
  )
}
