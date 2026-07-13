import api from '../services/api'
import toast from 'react-hot-toast'

const STANDARD_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js'
const MAGIC_SCRIPT = 'https://checkout.razorpay.com/v1/magic-checkout.js'

function loadScript(src) {
  return new Promise((resolve) => {
    const existing = document.querySelector(`script[src="${src}"]`)
    if (existing) {
      resolve(typeof window.Razorpay === 'function')
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.onload = () => resolve(typeof window.Razorpay === 'function')
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export const loadRazorpay = () => loadScript(STANDARD_SCRIPT)
export const loadMagicCheckout = () => loadScript(MAGIC_SCRIPT)

/**
 * Magic Checkout — address + prepaid payment in Razorpay (COD disabled for now).
 */
export async function openMagicCheckout({
  items,
  user,
  contact,
  paymentMethod = 'RAZORPAY',
  onSuccess,
  onDismiss
}) {
  const loaded = await loadMagicCheckout()
  if (!loaded) {
    toast.error('Payment gateway failed to load. Please try again.')
    return false
  }

  const email = contact?.email || user?.email || ''
  const phone = contact?.phone || user?.phone || ''
  const name = contact?.name || user?.name || ''

  const { data } = await api.post('/payments/magic/create', {
    items: items.map((i) => ({
      productId: i.productId,
      size: i.size,
      quantity: i.quantity
    })),
    contact: { name, phone, email },
    paymentMethod: 'RAZORPAY'
  })

  const orderId = data.order.orderId
  const prefill = {
    name,
    email: email || `${phone || 'customer'}@labelnine.in`,
    contact: phone ? (phone.startsWith('+') ? phone : `+91${phone}`) : ''
  }

  const options = {
    key: data.keyId,
    order_id: data.razorpayOrderId,
    one_click_checkout: true,
    name: 'Label Nine',
    show_coupons: true,
    prefill,
    theme: { color: '#000000' },
    handler: async (response) => {
      try {
        const { data: complete } = await api.post('/payments/magic/complete', {
          orderId,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature
        })
        toast.success('Payment successful!')
        onSuccess?.(complete.order)
      } catch (err) {
        toast.error(err.response?.data?.message || 'Could not confirm order')
      }
    },
    modal: {
      ondismiss: async () => {
        if (onDismiss) {
          await onDismiss(data.order)
        } else {
          toast.error('Payment cancelled. You can retry anytime.')
        }
      }
    }
  }

  const rzp = new window.Razorpay(options)
  rzp.open()
  return data.order
}

/**
 * Standard Razorpay Checkout — retry pay on an existing unpaid order.
 */
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
      ondismiss: async () => {
        if (onDismiss) {
          await onDismiss()
        } else {
          toast.error('Payment cancelled. You can retry anytime.')
        }
      }
    }
  })

  rzp.open()
  return true
}
