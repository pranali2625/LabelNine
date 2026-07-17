import { createContext, useContext, useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { calculateShipping, calculateNewCustomerDiscount } from '../constants/pricing'
import { useAuth } from './AuthContext'
import api from '../services/api'

const CartContext = createContext(null)

const CART_KEY = 'ln_cart'
const COUPON_KEY = 'ln_coupon'

export function CartProvider({ children }) {
  const { user } = useAuth()
  const [newCustomerEligible, setNewCustomerEligible] = useState(false)
  const [appliedCoupon, setAppliedCoupon] = useState(() => {
    try {
      const stored = localStorage.getItem(COUPON_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })
  const [couponLoading, setCouponLoading] = useState(false)
  const [items, setItems] = useState(() => {
    try {
      const stored = localStorage.getItem(CART_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  // Persist on change
  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items))
  }, [items])

  useEffect(() => {
    if (appliedCoupon) {
      localStorage.setItem(COUPON_KEY, JSON.stringify(appliedCoupon))
    } else {
      localStorage.removeItem(COUPON_KEY)
    }
  }, [appliedCoupon])

  useEffect(() => {
    let cancelled = false
    const checkDiscount = async () => {
      if (!user) {
        setNewCustomerEligible(false)
        setAppliedCoupon(null)
        return
      }
      try {
        const { data } = await api.get('/payments/new-customer-discount')
        if (!cancelled) setNewCustomerEligible(Boolean(data?.eligible))
      } catch {
        if (!cancelled) setNewCustomerEligible(false)
      }
    }
    checkDiscount()
    return () => {
      cancelled = true
    }
  }, [user])

  const cartTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)

  // Re-validate coupon when cart total or user changes
  useEffect(() => {
    let cancelled = false
    const refreshCoupon = async () => {
      if (!user || !appliedCoupon?.code) return
      try {
        const { data } = await api.post('/payments/validate-coupon', {
          code: appliedCoupon.code,
          itemsPrice: cartTotal
        })
        if (!cancelled) {
          setAppliedCoupon({
            code: data.code,
            discountPercent: data.discountPercent,
            discountAmount: data.discountAmount
          })
        }
      } catch (err) {
        if (!cancelled && err.response?.status === 400) {
          setAppliedCoupon(null)
          toast.error(err.response?.data?.message || 'Coupon no longer valid')
        }
      }
    }
    refreshCoupon()
    return () => {
      cancelled = true
    }
  }, [user, cartTotal, appliedCoupon?.code])

  const addToCart = (product, size, quantity = 1) => {
    setItems(prev => {
      const existing = prev.find(i => i.productId === product._id && i.size === size)
      if (existing) {
        toast.success('Quantity updated')
        return prev.map(i =>
          i.productId === product._id && i.size === size
            ? { ...i, quantity: i.quantity + quantity }
            : i
        )
      }
      toast.success('Added to cart')
      return [...prev, {
        productId: product._id,
        name: product.name,
        image: product.images[0]?.url || '',
        price: product.discountedPrice || product.price,
        originalPrice: product.price,
        size,
        quantity,
        variety: product.variety
      }]
    })
  }

  const updateQuantity = (productId, size, quantity) => {
    if (quantity < 1) return removeFromCart(productId, size)
    setItems(prev =>
      prev.map(i => i.productId === productId && i.size === size ? { ...i, quantity } : i)
    )
  }

  const removeFromCart = (productId, size) => {
    setItems(prev => prev.filter(i => !(i.productId === productId && i.size === size)))
    toast.success('Removed from cart')
  }

  const clearCart = () => {
    setItems([])
    setNewCustomerEligible(false)
    setAppliedCoupon(null)
  }

  const applyCoupon = async (code) => {
    if (!user) {
      toast.error('Sign in to apply a coupon')
      return false
    }
    const trimmed = String(code || '').trim()
    if (!trimmed) {
      toast.error('Enter a coupon code')
      return false
    }
    setCouponLoading(true)
    try {
      const { data } = await api.post('/payments/validate-coupon', {
        code: trimmed,
        itemsPrice: cartTotal
      })
      setAppliedCoupon({
        code: data.code,
        discountPercent: data.discountPercent,
        discountAmount: data.discountAmount
      })
      toast.success(`${data.code} applied — ${data.discountPercent}% off`)
      return true
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid coupon')
      return false
    } finally {
      setCouponLoading(false)
    }
  }

  const removeCoupon = () => {
    setAppliedCoupon(null)
    toast.success('Coupon removed')
  }

  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0)
  const welcomeDiscount = calculateNewCustomerDiscount(cartTotal, newCustomerEligible && !appliedCoupon)
  const discountAmount = appliedCoupon
    ? Number(appliedCoupon.discountAmount) || 0
    : welcomeDiscount
  const discountLabel = appliedCoupon
    ? `${appliedCoupon.code} (${appliedCoupon.discountPercent}% off)`
    : null
  const shippingCost = calculateShipping(cartTotal)
  const tax = 0 // GST disabled for now
  const orderTotal = cartTotal - discountAmount + shippingCost + tax

  return (
    <CartContext.Provider value={{
      items, addToCart, updateQuantity, removeFromCart, clearCart,
      cartTotal, cartCount, shippingCost, tax, orderTotal,
      discountAmount, newCustomerEligible,
      appliedCoupon, applyCoupon, removeCoupon, couponLoading, discountLabel
    }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
