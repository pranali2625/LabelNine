import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Truck } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { SHIPPING_THRESHOLD, FLAT_SHIPPING, NEW_CUSTOMER_DISCOUNT_PERCENT } from '../constants/pricing'

export default function Cart() {
  const {
    items, updateQuantity, removeFromCart, cartTotal, orderTotal, cartCount,
    shippingCost, welcomeDiscount, couponDiscount, newCustomerEligible,
    appliedCoupon, applyCoupon, removeCoupon, couponLoading
  } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [couponInput, setCouponInput] = useState('')

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <ShoppingBag className="w-16 h-16 mx-auto mb-6 text-gray-300" />
        <h2 className="text-2xl font-bold mb-3">Your cart is empty</h2>
        <p className="text-gray-500 mb-8">Looks like you haven't added anything yet</p>
        <Link to="/shop" className="inline-flex items-center gap-2 bg-black text-white px-8 py-4 font-semibold hover:bg-gray-800 transition-colors">
          SHOP NOW <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    )
  }

  const handleCheckout = () => {
    if (!user) {
      navigate('/login?redirect=checkout')
    } else {
      navigate('/checkout')
    }
  }

  const handleApplyCoupon = async (e) => {
    e.preventDefault()
    const ok = await applyCoupon(couponInput)
    if (ok) setCouponInput('')
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-bold mb-8">Shopping Cart ({cartCount} {cartCount === 1 ? 'item' : 'items'})</h1>

      <div className="grid lg:grid-cols-3 gap-10">
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map(item => (
            <div key={`${item.productId}-${item.size}`} className="flex gap-4 border border-gray-200 p-4">
              <div className="w-20 h-28 flex-shrink-0 bg-gray-100 overflow-hidden">
                <img src={item.image || 'https://placehold.co/80x112/e5e5e5/999'} alt={item.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{item.variety}</p>
                    <p className="font-semibold text-sm mb-1">{item.name}</p>
                    <p className="text-xs text-gray-500">Size: <span className="font-medium text-black">{item.size}</span></p>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.productId, item.size)}
                    className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                    aria-label="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center border border-gray-300">
                    <button
                      onClick={() => updateQuantity(item.productId, item.size, item.quantity - 1)}
                      className="p-2 hover:bg-gray-50 transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="px-4 text-sm font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.size, item.quantity + 1)}
                      className="p-2 hover:bg-gray-50 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="font-bold">₹{item.price * item.quantity}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order summary */}
        <div className="lg:col-span-1">
          <div className="border border-gray-200 p-6 sticky top-24">
            <h2 className="text-lg font-bold mb-6 tracking-wide">ORDER SUMMARY</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal ({cartCount} items)</span>
                <span>₹{cartTotal}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span className={shippingCost === 0 ? 'text-green-600 font-medium' : ''}>
                  {shippingCost === 0 ? 'FREE' : `₹{shippingCost}`}
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
                  <span>{appliedCoupon.code} ({appliedCoupon.discountPercent}% off)</span>
                  <span>−₹{couponDiscount}</span>
                </div>
              )}
              {user && (
                <div className="pt-1">
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-green-700 font-medium">{appliedCoupon.code} applied</span>
                      <button
                        type="button"
                        onClick={removeCoupon}
                        className="text-gray-500 hover:text-black underline"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleApplyCoupon} className="flex gap-2">
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        placeholder="Coupon code"
                        className="flex-1 border border-gray-300 px-3 py-2 text-sm uppercase tracking-wide focus:outline-none focus:border-black"
                      />
                      <button
                        type="submit"
                        disabled={couponLoading}
                        className="bg-black text-white px-4 py-2 text-xs font-semibold tracking-wide hover:bg-gray-800 disabled:opacity-50"
                      >
                        {couponLoading ? '...' : 'APPLY'}
                      </button>
                    </form>
                  )}
                </div>
              )}
              {user && !newCustomerEligible && (
                <p className="text-xs text-gray-400">
                  New customers with a unique email and phone get {NEW_CUSTOMER_DISCOUNT_PERCENT}% off their first order.
                </p>
              )}
              {user && newCustomerEligible && !appliedCoupon && (
                <p className="text-xs text-gray-400">
                  Have an invite code? Apply it above — it stacks with your new-customer discount.
                </p>
              )}
              {!user && (
                <p className="text-xs text-gray-400">
                  Sign in to apply a coupon or get {NEW_CUSTOMER_DISCOUNT_PERCENT}% off as a new customer.
                </p>
              )}
              <div className="border-t border-gray-200 pt-3 flex justify-between font-bold text-base">
                <span>Total</span>
                <span>₹{orderTotal}</span>
              </div>
            </div>
            {shippingCost > 0 && (
              <div className="mt-4 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 p-3">
                <Truck className="w-4 h-4 flex-shrink-0" />
                <span>Orders above ₹{SHIPPING_THRESHOLD} include a ₹{FLAT_SHIPPING} shipping fee</span>
              </div>
            )}
            <button
              onClick={handleCheckout}
              className="w-full bg-black text-white py-4 font-semibold tracking-wide hover:bg-gray-800 transition-colors mt-6 flex items-center justify-center gap-2"
            >
              PROCEED TO CHECKOUT <ArrowRight className="w-4 h-4" />
            </button>
            <Link to="/shop" className="block text-center text-sm text-gray-500 hover:text-black mt-4 transition-colors">
              ← Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
