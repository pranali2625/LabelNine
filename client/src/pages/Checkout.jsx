import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'
import { CreditCard, Smartphone, Truck } from 'lucide-react'

const STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu and Kashmir','Ladakh','Puducherry']

export default function Checkout() {
  const navigate = useNavigate()
  const { items, cartTotal, shippingCost, tax, orderTotal, clearCart } = useCart()
  const { user } = useAuth()

  const [address, setAddress] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    line1: '', line2: '', city: '', state: '', pincode: ''
  })
  const [loading, setLoading] = useState(false)

  const handleAddressChange = (e) => setAddress(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const loadRazorpay = () => new Promise(resolve => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })

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
      // 1. Create order in DB
      const { data: orderData } = await api.post('/orders', {
        items: items.map(i => ({ productId: i.productId, size: i.size, quantity: i.quantity })),
        shippingAddress: address,
        paymentMethod: 'UPI'
      })
      const order = orderData.order

      // 2. Load Razorpay
      const loaded = await loadRazorpay()
      if (!loaded) {
        toast.error('Payment gateway failed to load. Please try again.')
        setLoading(false)
        return
      }

      // 3. Create Razorpay order
      const { data: payData } = await api.post('/payments/create-order', { orderId: order.orderId })

      // 4. Open Razorpay checkout
      const options = {
        key: payData.keyId,
        amount: payData.amount,
        currency: payData.currency,
        name: 'Label Nine',
        description: `Order #${order.orderId}`,
        order_id: payData.razorpayOrderId,
        prefill: {
          name: address.name,
          contact: address.phone,
          email: user?.email || ''
        },
        theme: { color: '#111111' },
        handler: async (response) => {
          try {
            // 5. Verify payment
            await api.post('/payments/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderId: order.orderId
            })
            clearCart()
            navigate(`/order-success/${order.orderId}`)
          } catch {
            toast.error('Payment verification failed. Contact support.')
          }
        },
        modal: {
          ondismiss: () => {
            toast('Payment cancelled. Your order is saved — you can pay from My Orders.', { icon: 'ℹ️' })
            navigate(`/account/orders/${order.orderId}`)
          }
        }
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', () => toast.error('Payment failed. Please try again.'))
      rzp.open()

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
              <div className="flex items-center gap-3 border border-black p-4 bg-black/5">
                <Smartphone className="w-5 h-5" />
                <div>
                  <p className="font-semibold text-sm">UPI / Cards / Net Banking</p>
                  <p className="text-xs text-gray-500 mt-0.5">Secured by Razorpay. Pay via GPay, PhonePe, Paytm, UPI ID, Debit/Credit cards</p>
                </div>
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
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className={shippingCost === 0 ? 'text-green-600' : ''}>{shippingCost === 0 ? 'FREE' : `₹${shippingCost}`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">GST</span>
                  <span>₹{tax}</span>
                </div>
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
                {loading ? 'Processing...' : `PAY ₹${orderTotal}`}
              </button>
              <p className="text-xs text-center text-gray-500 mt-3 flex items-center justify-center gap-1">
                🔒 100% Secure Payment via Razorpay
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
