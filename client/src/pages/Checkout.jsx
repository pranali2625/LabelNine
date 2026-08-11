import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'
import { openMagicCheckout } from '../utils/razorpay'
import { ShieldCheck, Smartphone } from 'lucide-react'
import { NEW_CUSTOMER_DISCOUNT_PERCENT } from '../constants/pricing'

export default function Checkout() {
  const navigate = useNavigate()
  const { items, cartTotal, orderTotal, shippingCost, welcomeDiscount, couponDiscount, clearCart, appliedCoupon } = useCart()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  const abandonUnpaidOrder = async (orderId) => {
    try {
      await api.patch(`/orders/${orderId}/cancel`, {
        reason: 'Payment not completed',
        abandonedPayment: true
      })
    } catch {
      // keep checkout usable
    }
  }

  const handleCheckout = async (e) => {
    e.preventDefault()

    const contact = {
      name: user?.name || '',
      phone: String(user?.phone || '').replace(/\D/g, '').slice(-10),
      email: user?.email || ''
    }

    if (!contact.name?.trim()) {
      toast.error('Please update your name in Account settings')
      return
    }
    if (!/^[6-9]\d{9}$/.test(contact.phone)) {
      toast.error('Please update your mobile number in Account settings')
      return
    }

    if (!acceptedTerms) {
      toast.error('Please accept the terms and privacy policy before checkout.')
      return
    }

    setLoading(true)
    try {
      const order = await openMagicCheckout({
        items,
        user,
        contact,
        paymentMethod: 'RAZORPAY',
        couponCode: appliedCoupon?.code || null,
        onSuccess: (confirmed) => {
          clearCart()
          navigate(`/order-success/${confirmed.orderId}`)
        },
        onDismiss: async (draftOrder) => {
          if (draftOrder?.orderId) {
            await abandonUnpaidOrder(draftOrder.orderId)
          }
          toast.error('Checkout cancelled. No order was placed.')
        }
      })
      if (!order) return
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) {
    navigate('/cart')
    return null
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-bold mb-2">Checkout</h1>
      <p className="text-sm text-gray-500 mb-8">
        Delivery address and payment are collected in the next step. Maharashtra only.
      </p>

      <form onSubmit={handleCheckout}>
        <div className="grid lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-6">
            <div className="border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="w-5 h-5" />
                <h2 className="font-bold tracking-wide">PAYMENT &amp; DELIVERY</h2>
              </div>
              <div className="flex items-start gap-3 text-sm text-gray-600">
                <Smartphone className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-black">Pay online</p>
                  <p className="text-xs text-gray-500 mt-0.5">UPI, cards, netbanking &amp; wallets</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="border border-gray-200 p-6 sticky top-24">
              <h2 className="font-bold tracking-wide mb-4">ORDER SUMMARY</h2>
              <div className="space-y-3 mb-4">
                {items.map((item) => (
                  <div key={`${item.productId}-${item.size}`} className="flex gap-3 text-sm">
                    <img src={item.image} alt={item.name} className="w-12 h-16 object-cover bg-gray-100 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium leading-tight">{item.name}</p>
                      <p className="text-gray-500 text-xs mt-0.5">Size: {item.size} • Qty: {item.quantity}</p>
                      <p className="font-semibold mt-1">₹{item.price * item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-200 pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span>₹{cartTotal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className={shippingCost === 0 ? 'text-green-600' : ''}>
                    {shippingCost === 0 ? 'FREE' : `₹${shippingCost}`}
                  </span>
                </div>
                {welcomeDiscount > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>New customer ({NEW_CUSTOMER_DISCOUNT_PERCENT}% off)</span>
                    <span>−₹{welcomeDiscount}</span>
                  </div>
                )}
                {couponDiscount > 0 && appliedCoupon && (
                  <div className="flex justify-between text-green-700">
                    <span>
                      {appliedCoupon.code} ({appliedCoupon.discountPercent}% off
                      {appliedCoupon.excludeDiscountedProducts ? ', sale items excluded' : ''})
                    </span>
                    <span>−₹{couponDiscount}</span>
                  </div>
                )}
                <p className="text-xs text-gray-400">
                  Final shipping is confirmed for your delivery address.
                </p>
                <div className="flex justify-between font-bold text-base border-t pt-2">
                  <span>Total</span>
                  <span>₹{orderTotal}</span>
                </div>
              </div>
              <label className="flex items-start gap-3 mt-6 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(event) => setAcceptedTerms(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                />
                <span>
                  I agree to the{' '}
                  <Link to="/help/terms" className="text-black underline">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="/help/privacy" className="text-black underline">
                    Privacy Policy
                  </Link>
                </span>
              </label>
              <button
                type="submit"
                disabled={loading || !acceptedTerms}
                className="w-full bg-black text-white py-4 font-semibold tracking-wide mt-6 hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Please wait...' : `PAY NOW • ₹${orderTotal}`}
              </button>
              <p className="text-xs text-center text-gray-500 mt-3">
                You will complete payment securely in the next step
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
