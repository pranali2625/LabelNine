import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Package, ShoppingBag, Users, LogOut, Menu, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useState } from 'react'

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/admin/users', label: 'Users', icon: Users }
]

export default function AdminLayout() {
  const { logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const handleLogout = () => { logout(); navigate('/') }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-56 bg-black text-white transform transition-transform ${open ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
        <div className="p-5 border-b border-gray-800">
          <p className="text-lg font-bold tracking-[0.2em]">LABEL NINE</p>
          <p className="text-xs text-gray-400 mt-0.5">Admin Panel</p>
        </div>
        <nav className="p-3 flex-1">
          {NAV.map(({ to, label, icon: Icon, exact }) => {
            const active = exact ? location.pathname === to : location.pathname.startsWith(to) && to !== '/admin'
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded mb-1 transition-colors ${active ? 'bg-white text-black' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
              >
                <Icon className="w-4 h-4" /> {label}
              </Link>
            )
          })}
        </nav>
        <div className="p-3 border-t border-gray-800">
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-gray-800 w-full rounded transition-colors">
            <LogOut className="w-4 h-4" /> Logout
          </button>
          <Link to="/" className="block px-3 py-2 text-xs text-gray-500 hover:text-gray-300 transition-colors">← View Store</Link>
        </div>
      </aside>

      {open && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center gap-4">
          <button onClick={() => setOpen(true)} className="md:hidden p-2">
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-sm font-semibold text-gray-600 capitalize">
            {location.pathname === '/admin' ? 'Dashboard' : location.pathname.split('/').pop()}
          </h1>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
