import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Package, ChevronRight } from 'lucide-react'
import api from '../services/api'

const STATUS_COLORS = {
  placed: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-purple-100 text-purple-700',
  processing: 'bg-yellow-100 text-yellow-700',
  shipped: 'bg-orange-100 text-orange-700',
  out_for_delivery: 'bg-orange-100 text-orange-600',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  return_requested: 'bg-gray-100 text-gray-700',
  returned: 'bg-gray-100 text-gray-700'
}

export default function MyOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/orders/my')
      .then(res => setOrders(res.data.orders))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse border border-gray-200 p-4 h-24" />
        ))}
      </div>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">My Orders</h1>
        <Link to="/account" className="text-sm text-gray-500 hover:text-black transition-colors">← My Account</Link>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="font-medium">No orders yet</p>
          <Link to="/shop" className="inline-block mt-4 text-sm bg-black text-white px-6 py-2.5 font-semibold hover:bg-gray-800 transition-colors">
            SHOP NOW
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <Link
              key={order._id}
              to={`/account/orders/${order.orderId}`}
              className="block border border-gray-200 p-4 hover:border-black transition-colors group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-4">
                  {order.items[0]?.product?.images?.[0]?.url && (
                    <img
                      src={order.items[0].product.images[0].url}
                      alt=""
                      className="w-14 h-18 object-cover bg-gray-100 flex-shrink-0"
                    />
                  )}
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    <p className="font-bold text-sm mb-1">#{order.orderId}</p>
                    <p className="text-sm text-gray-600">
                      {order.items.length} {order.items.length === 1 ? 'item' : 'items'} • ₹{order.totalAmount}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {order.items.map(i => i.name).join(', ')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[order.orderStatus] || 'bg-gray-100 text-gray-700'}`}>
                    {order.orderStatus.replace(/_/g, ' ')}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-black transition-colors" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
