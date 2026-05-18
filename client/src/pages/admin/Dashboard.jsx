import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingBag, Users, Package, DollarSign, AlertTriangle, Clock } from 'lucide-react'
import api from '../../services/api'

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/dashboard')
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
      {[...Array(4)].map((_, i) => <div key={i} className="bg-white border border-gray-200 p-5 h-28" />)}
    </div>
  )

  const { stats, lowStockProducts, recentOrders } = data || {}

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ShoppingBag} label="Total Orders" value={stats?.totalOrders} color="bg-blue-50 text-blue-600" />
        <StatCard icon={DollarSign} label="Revenue" value={`₹${(stats?.totalRevenue || 0).toLocaleString('en-IN')}`} color="bg-green-50 text-green-600" />
        <StatCard icon={Package} label="Products" value={stats?.totalProducts} color="bg-purple-50 text-purple-600" />
        <StatCard icon={Users} label="Users" value={stats?.totalUsers} color="bg-orange-50 text-orange-600" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Low Stock */}
        {lowStockProducts?.length > 0 && (
          <div className="bg-white border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-sm tracking-wider">LOW STOCK ALERT</h3>
            </div>
            <div className="space-y-3">
              {lowStockProducts.map(p => (
                <div key={p._id} className="flex items-center justify-between">
                  <p className="text-sm font-medium">{p.name}</p>
                  <div className="flex gap-1">
                    {p.sizes.filter(s => s.stock <= 5).map(s => (
                      <span key={s.size} className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">
                        {s.size}: {s.stock}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <Link to="/admin/products" className="block text-center text-xs text-gray-500 hover:text-black mt-4 transition-colors">Manage Products →</Link>
          </div>
        )}

        {/* Recent Orders */}
        <div className="bg-white border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <h3 className="font-bold text-sm tracking-wider">RECENT ORDERS</h3>
            </div>
            <Link to="/admin/orders" className="text-xs text-gray-500 hover:text-black transition-colors">View all →</Link>
          </div>
          <div className="space-y-3">
            {recentOrders?.slice(0, 5).map(order => (
              <div key={order._id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">#{order.orderId}</p>
                  <p className="text-xs text-gray-500">{order.user?.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">₹{order.totalAmount}</p>
                  <span className={`text-xs capitalize px-2 py-0.5 rounded-full font-medium
                    ${order.orderStatus === 'delivered' ? 'bg-green-100 text-green-700' :
                      order.orderStatus === 'cancelled' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'}`}>
                    {order.orderStatus?.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pending orders */}
      {stats?.pendingOrders > 0 && (
        <div className="bg-amber-50 border border-amber-200 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertTriangle className="w-4 h-4" />
            <p className="text-sm font-medium">{stats.pendingOrders} orders need attention</p>
          </div>
          <Link to="/admin/orders?status=placed" className="text-sm font-semibold text-amber-800 hover:underline">View →</Link>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white border border-gray-200 p-5">
      <div className={`inline-flex p-2.5 rounded-lg mb-3 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold">{value ?? '—'}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}
