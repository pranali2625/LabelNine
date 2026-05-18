import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CheckCircle, Package, ArrowRight } from 'lucide-react'
import api from '../services/api'

export default function OrderSuccess() {
  const { orderId } = useParams()
  const [order, setOrder] = useState(null)

  useEffect(() => {
    api.get(`/orders/${orderId}`)
      .then(res => setOrder(res.data.order))
      .catch(console.error)
  }, [orderId])

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
      <h1 className="text-3xl font-bold mb-3">Order Placed!</h1>
      <p className="text-gray-500 mb-2">Thank you for shopping with Label Nine.</p>
      <p className="text-gray-500 mb-8">Your order ID is: <span className="font-bold text-black">{orderId}</span></p>

      {order && (
        <div className="bg-gray-50 border border-gray-200 p-6 mb-8 text-left">
          <h3 className="font-bold mb-4">Order Details</h3>
          {order.items?.map((item, i) => (
            <div key={i} className="flex justify-between text-sm py-2 border-b border-gray-100 last:border-0">
              <span>{item.name} (Size: {item.size} × {item.quantity})</span>
              <span className="font-medium">₹{item.price * item.quantity}</span>
            </div>
          ))}
          <div className="flex justify-between text-sm font-bold pt-3">
            <span>Total Paid</span>
            <span>₹{order.totalAmount}</span>
          </div>
          {order.estimatedDelivery && (
            <p className="text-xs text-gray-500 mt-3">
              Estimated delivery: <span className="font-medium text-black">{new Date(order.estimatedDelivery).toDateString()}</span>
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link to={`/track/${orderId}`} className="inline-flex items-center justify-center gap-2 border border-black px-6 py-3 font-semibold text-sm tracking-wide hover:bg-black hover:text-white transition-colors">
          <Package className="w-4 h-4" /> TRACK ORDER
        </Link>
        <Link to="/shop" className="inline-flex items-center justify-center gap-2 bg-black text-white px-6 py-3 font-semibold text-sm tracking-wide hover:bg-gray-800 transition-colors">
          CONTINUE SHOPPING <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}
