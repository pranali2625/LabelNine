import api from '../services/api'
import toast from 'react-hot-toast'

export const loadRazorpay = () => new Promise((resolve) => {
  if (window.Razorpay) {
    resolve(true)
    return
  }
  const script = document.createElement('script')
  script.src = 'https://checkout.razorpay.com/v1/checkout.js'
  script.onload = () => resolve(true)
  script.onerror = () => resolve(false)
  document.body.appendChild(script)
})

export async function openRazorpayCheckout({ order, user, shippingAddress, onSuccess, onDismiss }) {
  const loaded = await loadRazorpay()
  if (!loaded) {
    toast.error('Payment gateway failed to load. Please try again.')
    return false
  }

  const { data: payData } = await api.post('/payments/create-order', { orderId: order.orderId })

  const rzp = new window.Razorpay({
    key: payData.keyId,
    amount: payData.amount,
    currency: payData.currency,
    name: 'Label Nine',
    description: `Order ${order.orderId}`,
    order_id: payData.razorpayOrderId,
    prefill: {
      name: shippingAddress?.name || user?.name || '',
      contact: shippingAddress?.phone || user?.phone || '',
      email: user?.email || ''
    },
    theme: { color: '#000000' },
    handler: async (response) => {
      try {
        const { data } = await api.post('/payments/verify', {
          orderId: order.orderId,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature
        })
        toast.success('Payment successful!')
        onSuccess?.(data.order)
      } catch (err) {
        toast.error(err.response?.data?.message || 'Payment verification failed')
      }
    },
    modal: {
      ondismiss: () => {
        toast.error('Payment cancelled. You can retry anytime.')
        onDismiss?.()
      }
    }
  })

  rzp.open()
  return true
}
