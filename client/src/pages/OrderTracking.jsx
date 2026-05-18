import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Search, Package, Truck, CheckCircle, XCircle, Clock, MapPin } from 'lucide-react'
import api from '../services/api'

const STATUS_INFO = {
  placed: { label: 'Order Placed', icon: Package, color: 'text-blue-600', bg: 'bg-blue-100' },
  confirmed: { label: 'Confirmed', icon: CheckCircle, color: 'text-purple-600', bg: 'bg-purple-100' },
  processing: { label: 'Processing', icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100' },
  shipped: { label: 'Shipped', icon: Truck, color: 'text-orange-600', bg: 'bg-orange-100' },
  out_for_delivery: { label: 'Out for Delivery', icon: Truck, color: 'text-orange-500', bg: 'bg-orange-100' },
  delivered: { label: 'Delivered', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
  return_requested: { label: 'Return Requested', icon: Package, color: 'text-gray-600', bg: 'bg-gray-100' },
  returned: { label: 'Returned', icon: Package, color: 'text-gray-600', bg: 'bg-gray-100' }
}

const ORDER_STEPS = ['placed', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered']

export default function OrderTracking() {
  const { orderId: paramOrderId } = useParams()
  const navigate = useNavigate()
  const [query, setQuery] = useState(paramOrderId || '')
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (paramOrderId) handleTrack(paramOrderId)
  }, [paramOrderId])

  const handleTrack = async (id) => {
    const trackId = (id || query).trim()
    if (!trackId) return
    setLoading(true)
    setError('')
    setOrder(null)
    try {
      const { data } = await api.get(`/orders/track/${trackId}`)
      setOrder(data.order)
    } catch (err) {
      setError(err.response?.data?.message || 'Order not found. Please check the order ID.')
    } finally {
      setLoading(false)
    }
  }

  const currentStepIndex = order ? ORDER_STEPS.indexOf(order.orderStatus) : -1
  const isCancelled = order?.orderStatus === 'cancelled'

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
      <div className="text-center mb-10">
        <Package className="w-10 h-10 mx-auto mb-4 text-gray-400" />
        <h1 className="text-2xl font-bold tracking-tight mb-2">TRACK YOUR ORDER</h1>
        <p className="text-gray-500 text-sm">Enter your Order ID to get real-time tracking</p>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-10">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleTrack()}
          placeholder="Enter order ID (e.g. LN-ABC123-XYZ)"
          className="flex-1 border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:border-black transition-colors"
        />
        <button
          onClick={() => handleTrack()}
          disabled={loading}
          className="bg-black text-white px-6 py-3 font-semibold text-sm hover:bg-gray-800 transition-colors disabled:opacity-60 flex items-center gap-2"
        >
          <Search className="w-4 h-4" />
          {loading ? '...' : 'TRACK'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm mb-6">
          {error}
        </div>
      )}

      {order && (
        <div className="space-y-6">
          {/* Status card */}
          <div className="border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">ORDER ID</p>
                <p className="font-bold text-lg">{order.orderId}</p>
              </div>
              {STATUS_INFO[order.orderStatus] && (
                <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${STATUS_INFO[order.orderStatus].bg} ${STATUS_INFO[order.orderStatus].color}`}>
                  {STATUS_INFO[order.orderStatus].label}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <p className="text-xs font-semibold tracking-wider mb-1">ORDERED ON</p>
                <p>{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
              {order.estimatedDelivery && !isCancelled && (
                <div>
                  <p className="text-xs font-semibold tracking-wider mb-1">EST. DELIVERY</p>
                  <p>{new Date(order.estimatedDelivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
              )}
              {order.deliveredAt && (
                <div>
                  <p className="text-xs font-semibold tracking-wider mb-1">DELIVERED ON</p>
                  <p className="text-green-600 font-medium">{new Date(order.deliveredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold tracking-wider mb-1">TOTAL</p>
                <p className="font-semibold">₹{order.totalAmount}</p>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          {!isCancelled && (
            <div className="border border-gray-200 p-6">
              <h3 className="font-bold text-sm tracking-wider mb-6">ORDER PROGRESS</h3>
              <div className="relative">
                <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200" />
                <div
                  className="absolute top-4 left-0 h-0.5 bg-black transition-all duration-500"
                  style={{ width: currentStepIndex >= 0 ? `${(currentStepIndex / (ORDER_STEPS.length - 1)) * 100}%` : '0%' }}
                />
                <div className="relative flex justify-between">
                  {ORDER_STEPS.map((step, i) => {
                    const completed = currentStepIndex >= i
                    const info = STATUS_INFO[step]
                    return (
                      <div key={step} className="flex flex-col items-center gap-2">
                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center relative z-10 ${completed ? 'bg-black border-black text-white' : 'bg-white border-gray-300 text-gray-300'}`}>
                          {completed ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-current" />
                          )}
                        </div>
                        <p className={`text-[10px] font-medium text-center max-w-16 leading-tight ${completed ? 'text-black' : 'text-gray-400'}`}>
                          {info?.label}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Tracking history */}
          {order.trackingHistory?.length > 0 && (
            <div className="border border-gray-200 p-6">
              <h3 className="font-bold text-sm tracking-wider mb-4">TRACKING HISTORY</h3>
              <div className="space-y-4">
                {[...order.trackingHistory].reverse().map((event, i) => {
                  const info = STATUS_INFO[event.status]
                  return (
                    <div key={i} className="flex gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${info?.bg || 'bg-gray-100'} ${info?.color || 'text-gray-600'}`}>
                        <Package className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{event.message}</p>
                        {event.location && (
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" /> {event.location}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(event.timestamp).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Items */}
          {order.items?.length > 0 && (
            <div className="border border-gray-200 p-6">
              <h3 className="font-bold text-sm tracking-wider mb-4">ITEMS ({order.items.length})</h3>
              <div className="space-y-2">
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm py-2 border-b border-gray-100 last:border-0">
                    <span>{item.name} <span className="text-gray-500">(Size: {item.size} × {item.quantity})</span></span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
