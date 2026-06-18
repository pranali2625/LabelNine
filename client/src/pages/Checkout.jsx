import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'
import { openRazorpayCheckout } from '../utils/razorpay'
import { Banknote, CreditCard, Smartphone, Truck } from 'lucide-react'

const STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu and Kashmir','Ladakh','Puducherry']

export default function Checkout() {
  const navigate = useNavigate()
  const { items, cartTotal, orderTotal, clearCart } = useCart()
  const { user } = useAuth()

  const [address, setAddress] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    line1: '', line2: '', city: '', state: '', pincode: ''
  })
  const [paymentMethod, setPaymentMethod] = useState('COD')
  const [loading, setLoading] = useState(false)

  const handleAddressChange = (e) => setAddress(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const startRazorpay = async (order) => {
    await openRazorpayCheckout({
      order,
      user,
      shippingAddress: address,
      onSuccess: () => {
        clearCart()
        navigate(`/order-success/${order.orderId}`)
      },
      onDismiss: () => navigate(`/account/orders/${order.orderId}`)
    })
  }

  const handlePlaceOrder = async (e) => {
    e.preventDefault()
    if (!address.name || !address.phone || !address.line1 || !address.city || !address.state || !address.pincode) {
      toast.error('Please fill in all required address fields')
      return
    }
    if (!/^[6-9]\d{9}$/.test(address.phone)) {
      toast.error('Please enter a valid 10-digit mobile number')
      return
    }
    if (!/^[1-9][0-9]{5}$/.test(address.pincode)) {
      toast.error('Please enter a valid 6-digit pincode')
      return
    }

    setLoading(true)
    try {
      const { data: orderData } = await api.post('/orders', {
        items: items.map(i => ({ productId: i.productId, size: i.size, quantity: i.quantity })),
        shippingAddress: address,
        paymentMethod
      })
      const order = orderData.order

      if (paymentMethod === 'RAZORPAY') {
        setLoading(false)
        await startRazorpay(order)
        return
      }

      clearCart()
      navigate(`/order-success/${order.orderId}`)
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

  const paymentOptions = [
    {
      id: 'COD',
      icon: Banknote,
      title: 'Cash on Delivery (COD)',
      description: 'Pay in cash when your order is delivered at your doorstep'
    },
    {
      id: 'RAZORPAY',
      icon: Smartphone,
      title: 'Pay Online (UPI / Cards / Netbanking)',
      description: 'Secure payment via Razorpay — UPI, debit/credit cards, wallets'
    }
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-bold mb-8">Checkout</h1>
      <form onSubmit={handlePlaceOrder}>
        <div className="grid lg:grid-cols-3 gap-10">
          {/* Delivery address */}
          <div className="lg:col-span-2 space-y-6">
            <div className="border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-5">
                <Truck className="w-5 h-5" />
                <h2 className="font-bold tracking-wide">DELIVERY ADDRESS</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold tracking-wider text-gray-600 mb-1">FULL NAME *</label>
                  <input name="name" value={address.name} onChange={handleAddressChange} required className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-black transition-colors" placeholder="Full name" />
                </div>
                <div>
                  <label className="block text-xs font-semibold tracking-wider text-gray-600 mb-1">MOBILE NUMBER *</label>
                  <input name="phone" value={address.phone} onChange={handleAddressChange} required maxLength={10} className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-black transition-colors" placeholder="10-digit mobile number" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold tracking-wider text-gray-600 mb-1">ADDRESS LINE 1 *</label>
                  <input name="line1" value={address.line1} onChange={handleAddressChange} required className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-black transition-colors" placeholder="House/Flat no., Building name, Street" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold tracking-wider text-gray-600 mb-1">ADDRESS LINE 2</label>
                  <input name="line2" value={address.line2} onChange={handleAddressChange} className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-black transition-colors" placeholder="Area, Colony, Landmark (optional)" />
                </div>
                <div>
                  <label className="block text-xs font-semibold tracking-wider text-gray-600 mb-1">CITY *</label>
                  <input name="city" value={address.city} onChange={handleAddressChange} required className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-black transition-colors" placeholder="City" />
                </div>
                <div>
                  <label className="block text-xs font-semibold tracking-wider text-gray-600 mb-1">PINCODE *</label>
                  <input name="pincode" value={address.pincode} onChange={handleAddressChange} required maxLength={6} className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-black transition-colors" placeholder="6-digit pincode" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold tracking-wider text-gray-600 mb-1">STATE *</label>
                  <select name="state" value={address.state} onChange={handleAddressChange} required className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-black transition-colors bg-white">
                    <option value="">Select State</option>
                    {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Payment method */}
            <div className="border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5" />
                <h2 className="font-bold tracking-wide">PAYMENT</h2>
              </div>
              <div className="space-y-3">
                {paymentOptions.map(({ id, icon: Icon, title, description }) => (
                  <label
                    key={id}
                    className={`flex items-center gap-3 border p-4 cursor-pointer transition-colors ${
                      paymentMethod === id ? 'border-black bg-black/5' : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={id}
                      checked={paymentMethod === id}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="sr-only"
                    />
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-sm">{title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Order summary */}
          <div className="lg:col-span-1">
            <div className="border border-gray-200 p-6 sticky top-24">
              <h2 className="font-bold tracking-wide mb-4">ORDER SUMMARY</h2>
              <div className="space-y-3 mb-4">
                {items.map(item => (
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
                {/* <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className={shippingCost === 0 ? 'text-green-600' : ''}>{shippingCost === 0 ? 'FREE' : `₹${shippingCost}`}</span>
                </div> */}
                {/* GST disabled for now
                <div className="flex justify-between">
                  <span className="text-gray-600">GST</span>
                  <span>₹{tax}</span>
                </div>
                */}
                <div className="flex justify-between font-bold text-base border-t pt-2">
                  <span>Total</span>
                  <span>₹{orderTotal}</span>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-black text-white py-4 font-semibold tracking-wide mt-6 hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading
                  ? 'Placing order...'
                  : paymentMethod === 'RAZORPAY'
                    ? `PAY NOW • ₹${orderTotal}`
                    : `PLACE ORDER • ₹${orderTotal}`}
              </button>
              <p className="text-xs text-center text-gray-500 mt-3">
                {paymentMethod === 'COD'
                  ? `You will pay ₹${orderTotal} in cash on delivery`
                  : 'You will be redirected to Razorpay to complete payment'}
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
