import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingBag, User, Menu, X, Search, Package } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { user, logout, isAdmin } = useAuth()
  const { cartCount } = useCart()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    setUserMenuOpen(false)
    navigate('/')
  }

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="text-2xl font-bold tracking-[0.3em] text-black">
            LABEL NINE
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-sm font-medium text-gray-700 hover:text-black tracking-wide transition-colors">HOME</Link>
            <Link to="/shop" className="text-sm font-medium text-gray-700 hover:text-black tracking-wide transition-colors">SHOP</Link>
            <Link to="/track" className="text-sm font-medium text-gray-700 hover:text-black tracking-wide transition-colors">TRACK ORDER</Link>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            {/* Cart */}
            <Link to="/cart" className="relative p-2 hover:text-gray-600 transition-colors">
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-black text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Link>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="p-2 hover:text-gray-600 transition-colors"
                aria-label="User menu"
              >
                <User className="w-5 h-5" />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 shadow-lg z-50">
                  {user ? (
                    <>
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-semibold text-black truncate">{user.name}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email || user.phone}</p>
                      </div>
                      <Link to="/account" onClick={() => setUserMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">My Account</Link>
                      <Link to="/account/orders" onClick={() => setUserMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">My Orders</Link>
                      {isAdmin && (
                        <Link to="/admin" onClick={() => setUserMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 font-medium">Admin Panel</Link>
                      )}
                      <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50 border-t border-gray-100">
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <Link to="/login" onClick={() => setUserMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Login</Link>
                      <Link to="/register" onClick={() => setUserMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Register</Link>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Mobile menu toggle */}
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2" aria-label="Toggle menu">
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 py-4 space-y-1">
            <Link to="/" onClick={() => setMenuOpen(false)} className="block px-2 py-2 text-sm font-medium text-gray-700 hover:text-black">HOME</Link>
            <Link to="/shop" onClick={() => setMenuOpen(false)} className="block px-2 py-2 text-sm font-medium text-gray-700 hover:text-black">SHOP</Link>
            <Link to="/track" onClick={() => setMenuOpen(false)} className="block px-2 py-2 text-sm font-medium text-gray-700 hover:text-black">TRACK ORDER</Link>
            {user ? (
              <>
                <Link to="/account" onClick={() => setMenuOpen(false)} className="block px-2 py-2 text-sm font-medium text-gray-700 hover:text-black">MY ACCOUNT</Link>
                <Link to="/account/orders" onClick={() => setMenuOpen(false)} className="block px-2 py-2 text-sm font-medium text-gray-700 hover:text-black">MY ORDERS</Link>
                {isAdmin && <Link to="/admin" onClick={() => setMenuOpen(false)} className="block px-2 py-2 text-sm font-medium">ADMIN</Link>}
                <button onClick={handleLogout} className="block w-full text-left px-2 py-2 text-sm font-medium text-red-600">LOGOUT</button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMenuOpen(false)} className="block px-2 py-2 text-sm font-medium text-gray-700 hover:text-black">LOGIN</Link>
                <Link to="/register" onClick={() => setMenuOpen(false)} className="block px-2 py-2 text-sm font-medium text-gray-700 hover:text-black">REGISTER</Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
