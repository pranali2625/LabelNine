import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import toast from 'react-hot-toast'
import { calculateNewCustomerDiscount } from '../constants/pricing'
import {
  FESTIVAL_OFFERS,
  FESTIVAL_SHIPPING,
  bestFestivalSelection,
  isFestivalOfferActive,
  quoteFestivalOffer
} from '../constants/festivalOffers'
import { useAuth } from './AuthContext'
import api from '../services/api'

const CartContext = createContext(null)

const CART_KEY = 'ln_cart'
const COUPON_KEY = 'ln_coupon'

function offerIdForCart(cartItems) {
  const count = (cartItems || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
  if (count >= FESTIVAL_OFFERS.b2g2.required) return 'b2g2'
  if (count >= FESTIVAL_OFFERS.b1g199.required) return 'b1g199'
  return null
}

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
  useEffect(() => {
    localStorage.removeItem('ln_festival_offer')
  }, [])

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
  const festivalActive = isFestivalOfferActive()
  const activeOfferId = festivalActive ? offerIdForCart(items) : null
  const safeSelections = useMemo(
    () => (activeOfferId ? bestFestivalSelection(items, activeOfferId) : []),
    [items, activeOfferId]
  )
  const festivalQuote = quoteFestivalOffer(
    items,
    activeOfferId,
    safeSelections
  )
  const festivalPayload = activeOfferId && festivalQuote.applied
    ? { festivalOffer: { id: activeOfferId, selections: safeSelections } }
    : {}

  // Re-validate coupon when cart, offer, or user changes
  useEffect(() => {
    let cancelled = false
    const refreshCoupon = async () => {
      if (!user || !appliedCoupon?.code) return
      try {
        const { data } = await api.post('/payments/validate-coupon', {
          code: appliedCoupon.code,
          itemsPrice: cartTotal,
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            size: i.size
          })),
          ...(activeOfferId && festivalQuote.applied
            ? { festivalOffer: { id: activeOfferId, selections: safeSelections } }
            : {})
        })
        if (!cancelled) {
          setAppliedCoupon({
            code: data.code,
            discountPercent: data.discountPercent,
            discountAmount: data.discountAmount,
            productScoped: data.productScoped,
            eligibleSubtotal: data.eligibleSubtotal
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
  }, [user, cartTotal, items, appliedCoupon?.code, activeOfferId, festivalQuote.applied, safeSelections])

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
        hasProductDiscount: product.discountedPrice != null,
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
        itemsPrice: cartTotal,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          size: i.size
        })),
        ...festivalPayload
      })
      setAppliedCoupon({
        code: data.code,
        discountPercent: data.discountPercent,
        discountAmount: data.discountAmount,
        productScoped: data.productScoped,
        eligibleSubtotal: data.eligibleSubtotal
      })
      const scopeNote = data.productScoped ? ' (selected products only)' : ''
      toast.success(`${data.code} applied — ${data.discountPercent}% off${scopeNote}`)
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
  const festivalDiscount = festivalQuote.applied ? festivalQuote.discountAmount : 0
  const merchandiseAfterOffer = Math.max(0, cartTotal - festivalDiscount)
  const welcomeDiscount = calculateNewCustomerDiscount(merchandiseAfterOffer, newCustomerEligible)
  const couponDiscount = Number(appliedCoupon?.discountAmount) || 0
  const discountAmount = Math.round((festivalDiscount + welcomeDiscount + couponDiscount) * 100) / 100
  const shippingCost = festivalQuote.applied ? FESTIVAL_SHIPPING : 0
  const tax = 0 // GST disabled for now
  // Whole rupees only — drop paise (1399.1 → 1399)
  const orderTotal = Math.max(
    0,
    Math.floor(cartTotal - discountAmount + shippingCost + tax + 1e-9)
  )
  const festivalCheckoutReady = !activeOfferId || festivalQuote.ok

  return (
    <CartContext.Provider value={{
      items, addToCart, updateQuantity, removeFromCart, clearCart,
      cartTotal, cartCount, shippingCost, tax, orderTotal,
      discountAmount, welcomeDiscount, couponDiscount, newCustomerEligible,
      appliedCoupon, applyCoupon, removeCoupon, couponLoading,
      festivalActive, festivalOfferId: activeOfferId, festivalSelections: safeSelections, festivalQuote,
      festivalDiscount, festivalCheckoutReady
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
