import { useEffect, useState } from 'react'
import { Search, ChevronDown, Check, X } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

const STATUSES = ['placed', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled']
const STATUS_COLORS = {
  placed: 'bg-blue-100 text-blue-700', confirmed: 'bg-purple-100 text-purple-700',
  processing: 'bg-yellow-100 text-yellow-700', shipped: 'bg-orange-100 text-orange-700',
  out_for_delivery: 'bg-orange-100 text-orange-600', delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700'
}

function canCreateShiprocket(order) {
  if (order.shiprocket?.orderId) return false
  return ['confirmed', 'processing'].includes(order.orderStatus)
}

function shiprocketStatusMessage(order) {
  if (order.shiprocket?.orderId) return null
  if (order.orderStatus === 'placed' && order.paymentInfo?.status !== 'paid') {
    return 'Awaiting payment — Shiprocket syncs after payment is confirmed'
  }
  if (!['confirmed', 'processing'].includes(order.orderStatus)) {
    return 'Set status to Confirmed or Processing, then create shipment'
  }
  if (order.paymentInfo?.status !== 'paid') {
    return 'Payment pending — create shipment if you have verified payment offline'
  }
  return 'Ready to send to Shiprocket'
}

export default function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [search, setSearch] = useState('')
  const [updating, setUpdating] = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [shiprocketLoading, setShiprocketLoading] = useState(null)

  const fetchOrders = (status = filter, q = search) => {
    setLoading(true)
    const params = new URLSearchParams({ limit: 50 })
    if (status) params.append('status', status)
    if (q) params.append('search', q)
    api.get(`/admin/orders?${params}`)
      .then(res => setOrders(res.data.orders))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchOrders() }, [filter])

  const handleStatusUpdate = async (orderId, status, message) => {
    setUpdating(orderId)
    try {
      await api.patch(`/admin/orders/${orderId}/status`, { status, message })
      toast.success('Order status updated')
      fetchOrders()
    } catch {
      toast.error('Update failed')
    } finally {
      setUpdating(null)
    }
  }

  const handleShiprocket = async (orderId, action) => {
    setShiprocketLoading(`${orderId}-${action}`)
    try {
      let res
      if (action === 'create') {
        res = await api.post(`/admin/orders/${orderId}/shiprocket/create`)
        toast.success('Sent to Shiprocket')
      } else if (action === 'awb') {
        res = await api.post(`/admin/orders/${orderId}/shiprocket/assign-awb`)
        toast.success('AWB assigned')
      } else if (action === 'label') {
        res = await api.get(`/admin/orders/${orderId}/shiprocket/label`)
        if (res.data.labelUrl) window.open(res.data.labelUrl, '_blank')
        toast.success('Label ready')
      } else if (action === 'sync') {
        res = await api.post(`/admin/orders/${orderId}/shiprocket/sync-tracking`)
        toast.success('Tracking synced')
      }
      if (res?.data?.order) {
        setOrders(prev => prev.map(o => o.orderId === orderId ? res.data.order : o))
      } else {
        fetchOrders()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Shiprocket action failed')
    } finally {
      setShiprocketLoading(null)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Orders</h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilter('')} className={`px-3 py-1.5 text-xs font-semibold border transition-colors ${!filter ? 'bg-black text-white border-black' : 'border-gray-300 hover:border-black'}`}>All</button>
          {STATUSES.map(s => (
            <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 text-xs font-semibold border transition-colors capitalize ${filter === s ? 'bg-black text-white border-black' : 'border-gray-300 hover:border-black'}`}>
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
        <div className="flex gap-2 ml-auto">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchOrders(filter, search)}
            placeholder="Search order ID..."
            className="border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-black"
          />
          <button onClick={() => fetchOrders(filter, search)} className="bg-black text-white px-3 py-1.5 hover:bg-gray-800 transition-colors">
            <Search className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2 animate-pulse">{[...Array(5)].map((_, i) => <div key={i} className="bg-white border h-16" />)}</div>
      ) : (
        <div className="bg-white border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-xs tracking-wider">ORDER ID</th>
                <th className="text-left px-4 py-3 font-semibold text-xs tracking-wider">CUSTOMER</th>
                <th className="text-left px-4 py-3 font-semibold text-xs tracking-wider">DATE</th>
                <th className="text-left px-4 py-3 font-semibold text-xs tracking-wider">AMOUNT</th>
                <th className="text-left px-4 py-3 font-semibold text-xs tracking-wider">PAYMENT</th>
                <th className="text-left px-4 py-3 font-semibold text-xs tracking-wider">STATUS</th>
                <th className="text-left px-4 py-3 font-semibold text-xs tracking-wider">UPDATE</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <>
                  <tr key={order._id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <button onClick={() => setExpanded(expanded === order._id ? null : order._id)} className="font-mono text-xs font-semibold hover:underline flex items-center gap-1">
                        #{order.orderId}
                        <ChevronDown className={`w-3 h-3 transition-transform ${expanded === order._id ? 'rotate-180' : ''}`} />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{order.user?.name}</p>
                      <p className="text-xs text-gray-500">{order.user?.phone || order.user?.email}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {new Date(order.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-4 py-3 font-semibold">₹{order.totalAmount}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${order.paymentInfo?.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {order.paymentInfo?.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${STATUS_COLORS[order.orderStatus] || 'bg-gray-100 text-gray-700'}`}>
                        {order.orderStatus?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={order.orderStatus}
                        onChange={e => handleStatusUpdate(order.orderId, e.target.value, '')}
                        disabled={updating === order.orderId || order.orderStatus === 'cancelled' || order.orderStatus === 'delivered'}
                        className="border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:border-black bg-white disabled:opacity-50 capitalize"
                      >
                        {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                      </select>
                    </td>
                  </tr>
                  {expanded === order._id && (
                    <tr key={`${order._id}-expanded`} className="bg-gray-50">
                      <td colSpan={7} className="px-4 py-4">
                        <div className="text-xs space-y-2">
                          <p className="font-semibold mb-2">Items:</p>
                          {order.items?.map((item, i) => (
                            <div key={i} className="flex gap-2">
                              <img src={item.image} alt="" className="w-8 h-10 object-cover bg-gray-200 flex-shrink-0" />
                              <span>{item.name} — Size: {item.size} × {item.quantity} — ₹{item.price * item.quantity}</span>
                            </div>
                          ))}
                          <p className="mt-2 text-gray-600">
                            Ship to: {order.shippingAddress?.name}, {order.shippingAddress?.city}, {order.shippingAddress?.state} - {order.shippingAddress?.pincode} | {order.shippingAddress?.phone}
                          </p>
                          {order.notes && (
                            <p className="mt-2 text-sm font-medium text-[#9B2C2C]">{order.notes}</p>
                          )}
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="font-semibold mb-2">Shiprocket</p>
                            {order.shiprocket?.orderId ? (
                              <div className="space-y-1 text-gray-600">
                                <p>SR Order: {order.shiprocket.orderId} | Shipment: {order.shiprocket.shipmentId || '—'}</p>
                                <p>AWB: {order.shiprocket.awb || 'Not assigned'} {order.shiprocket.courier && `(${order.shiprocket.courier})`}</p>
                                <p>Status: {order.shiprocket.status || '—'}</p>
                              </div>
                            ) : (
                              <p className="text-gray-500">{shiprocketStatusMessage(order)}</p>
                            )}
                            <div className="flex flex-wrap gap-2 mt-2">
                              {canCreateShiprocket(order) && (
                                <button
                                  onClick={() => handleShiprocket(order.orderId, 'create')}
                                  disabled={!!shiprocketLoading}
                                  className="px-2 py-1 border border-gray-300 text-xs hover:border-black disabled:opacity-50"
                                >
                                  {shiprocketLoading === `${order.orderId}-create` ? 'Sending…' : 'Create Shipment'}
                                </button>
                              )}
                              {order.shiprocket?.shipmentId && !order.shiprocket?.awb && (
                                <button
                                  onClick={() => handleShiprocket(order.orderId, 'awb')}
                                  disabled={!!shiprocketLoading}
                                  className="px-2 py-1 border border-gray-300 text-xs hover:border-black disabled:opacity-50"
                                >
                                  {shiprocketLoading === `${order.orderId}-awb` ? 'Assigning…' : 'Assign AWB'}
                                </button>
                              )}
                              {order.shiprocket?.shipmentId && (
                                <button
                                  onClick={() => handleShiprocket(order.orderId, 'label')}
                                  disabled={!!shiprocketLoading}
                                  className="px-2 py-1 border border-gray-300 text-xs hover:border-black disabled:opacity-50"
                                >
                                  {shiprocketLoading === `${order.orderId}-label` ? 'Loading…' : 'Print Label'}
                                </button>
                              )}
                              {order.shiprocket?.awb && (
                                <button
                                  onClick={() => handleShiprocket(order.orderId, 'sync')}
                                  disabled={!!shiprocketLoading}
                                  className="px-2 py-1 border border-gray-300 text-xs hover:border-black disabled:opacity-50"
                                >
                                  {shiprocketLoading === `${order.orderId}-sync` ? 'Syncing…' : 'Sync Tracking'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && (
            <div className="text-center py-12 text-gray-500 text-sm">No orders found</div>
          )}
        </div>
      )}
    </div>
  )
}
