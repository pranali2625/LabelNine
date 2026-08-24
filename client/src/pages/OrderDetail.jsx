import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { openRazorpayCheckout } from '../utils/razorpay'

const STATUS_COLORS = {
  placed: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-purple-100 text-purple-700',
  processing: 'bg-yellow-100 text-yellow-700',
  shipped: 'bg-orange-100 text-orange-700',
  out_for_delivery: 'bg-orange-100 text-orange-600',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700'
}

export default function OrderDetail() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [paying, setPaying] = useState(false)

  useEffect(() => {
    api.get(`/orders/${orderId}`)
      .then(res => setOrder(res.data.order))
      .catch(() => navigate('/account/orders'))
      .finally(() => setLoading(false))
  }, [orderId])

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this order?')) return
    setCancelling(true)
    try {
      const { data } = await api.patch(`/orders/${orderId}/cancel`, { reason: 'Cancelled by customer' })
      setOrder(data.order)
      toast.success('Order cancelled')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot cancel order')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-10 animate-pulse"><div className="h-64 bg-gray-200" /></div>
  if (!order) return null

  const canCancel = ['placed', 'confirmed'].includes(order.orderStatus)
    && order.paymentInfo?.status !== 'paid'
  const canPay = order.paymentInfo?.method === 'RAZORPAY'
    && order.paymentInfo?.status !== 'paid'
    && order.orderStatus !== 'cancelled'

  const handlePay = async () => {
    setPaying(true)
    try {
      await openRazorpayCheckout({
        order,
        user,
        shippingAddress: order.shippingAddress,
        onSuccess: (updatedOrder) => {
          setOrder(updatedOrder)
          navigate(`/order-success/${order.orderId}`)
        }
      })
    } finally {
      setPaying(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link to="/account/orders" className="text-xs text-gray-500 hover:text-black transition-colors mb-1 block">← My Orders</Link>
          <h1 className="text-xl font-bold">Order #{order.orderId}</h1>
        </div>
        <span className={`text-xs font-semibold px-3 py-1.5 rounded-full capitalize ${STATUS_COLORS[order.orderStatus] || 'bg-gray-100 text-gray-700'}`}>
          {order.orderStatus?.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="space-y-6">
        {/* Items */}
        <div className="border border-gray-200 p-6">
          <h3 className="font-bold text-sm tracking-wider mb-4">ITEMS</h3>
          <div className="space-y-4">
            {order.items?.map((item, i) => (
              <div key={i} className="flex gap-4">
                <img src={item.image || 'https://placehold.co/64x80/e5e5e5/999'} alt={item.name} className="w-16 h-20 object-cover bg-gray-100 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-sm">{item.name}</p>
                  <p className="text-xs text-gray-500 mt-1">Size: {item.size} • Qty: {item.quantity}</p>
                  <p className="font-bold text-sm mt-1">₹{item.price * item.quantity}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 mt-4 pt-4 space-y-1 text-sm">
            <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>₹{order.itemsPrice}</span></div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-green-700">
                <span>{order.discountCode || 'New customer'} discount</span>
                <span>−₹{order.discountAmount}</span>
              </div>
            )}
            {order.notes && (
              <div className="flex justify-between text-gray-600">
                <span>Rakhi gift hamper</span>
                <span className={order.notes.toLowerCase().includes('declined') ? 'text-gray-400' : 'text-green-600 font-medium'}>
                  {order.notes.toLowerCase().includes('declined') ? 'Not included' : 'FREE'}
                </span>
              </div>
            )}
            {/* <div className="flex justify-between text-gray-600"><span>Shipping</span><span>{order.shippingPrice === 0 ? 'FREE' : `₹{order.shippingPrice}`}</span></div> */}
            {/* GST disabled for now
            <div className="flex justify-between text-gray-600"><span>GST</span><span>₹{order.taxPrice}</span></div>
            */}
            <div className="flex justify-between font-bold text-base pt-1 border-t"><span>Total</span><span>₹{order.totalAmount}</span></div>
          </div>
        </div>

        {/* Shipping & Payment */}
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4" />
              <h3 className="font-bold text-sm tracking-wider">DELIVERY ADDRESS</h3>
            </div>
            {order.shippingAddress && (
              <div className="text-sm text-gray-600 space-y-0.5">
                <p className="font-medium text-black">{order.shippingAddress.name}</p>
                <p>{order.shippingAddress.line1}</p>
                {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
                <p>{order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}</p>
                <p className="mt-1">{order.shippingAddress.phone}</p>
              </div>
            )}
          </div>
          <div className="border border-gray-200 p-5">
            <h3 className="font-bold text-sm tracking-wider mb-3">PAYMENT</h3>
            <p className="text-sm font-medium">{order.paymentInfo?.method}</p>
            <p className={`text-xs mt-1 font-semibold capitalize ${
              order.paymentInfo?.status === 'paid' ? 'text-green-600' :
              order.paymentInfo?.method === 'COD' ? 'text-amber-600' : 'text-red-500'
            }`}>
              {order.paymentInfo?.status === 'paid' ? '✓ Paid' :
               order.paymentInfo?.method === 'COD' ? 'Pay on delivery' : '✗ Pending'}
            </p>
            {order.paymentInfo?.paidAt && (
              <p className="text-xs text-gray-500 mt-1">{new Date(order.paymentInfo.paidAt).toLocaleString('en-IN')}</p>
            )}
          </div>
        </div>

        {/* Tracking */}
        {order.shiprocket?.awb && (
          <div className="border border-gray-200 p-5 mb-6">
            <h3 className="font-bold text-sm tracking-wider mb-2">SHIPMENT</h3>
            <p className="text-sm text-gray-600">
              AWB: <span className="font-mono font-medium text-black">{order.shiprocket.awb}</span>
              {order.shiprocket.courier && <span className="ml-2">via {order.shiprocket.courier}</span>}
            </p>
            {order.shiprocket.status && (
              <p className="text-xs text-gray-500 mt-1 capitalize">{order.shiprocket.status.toLowerCase()}</p>
            )}
          </div>
        )}
        {order.trackingHistory?.length > 0 && (
          <div className="border border-gray-200 p-6">
            <h3 className="font-bold text-sm tracking-wider mb-4">TRACKING HISTORY</h3>
            <div className="space-y-3">
              {[...order.trackingHistory].reverse().map((event, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-black mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">{event.message}</p>
                    {event.location && <p className="text-xs text-gray-500">{event.location}</p>}
                    <p className="text-xs text-gray-400">{new Date(event.timestamp).toLocaleString('en-IN')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 flex-wrap">
          {canPay && (
            <button
              onClick={handlePay}
              disabled={paying}
              className="flex-1 min-w-[140px] bg-black text-white py-3 text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-60"
            >
              {paying ? 'Opening payment...' : `PAY NOW • ₹${order.totalAmount}`}
            </button>
          )}
          <Link to={`/track/${order.orderId}`} className="flex-1 min-w-[140px] text-center border border-gray-300 py-3 text-sm font-semibold hover:border-black transition-colors">
            TRACK ORDER
          </Link>
          {canCancel && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="flex-1 border border-red-300 text-red-600 py-3 text-sm font-semibold hover:bg-red-50 transition-colors disabled:opacity-60"
            >
              {cancelling ? 'Cancelling...' : 'CANCEL ORDER'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
