import { createContext, useContext, useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { calculateNewCustomerDiscount } from '../constants/pricing'
import {
  FESTIVAL_OFFERS,
  bestFestivalSelection,
  isFestivalOfferActive,
  quoteFestivalOffer
} from '../constants/festivalOffers'
import { useAuth } from './AuthContext'
import api from '../services/api'

const CartContext = createContext(null)

const CART_KEY = 'ln_cart'
const COUPON_KEY = 'ln_coupon'
const OFFER_KEY = 'ln_festival_offer'

function readStoredOffer() {
  if (!isFestivalOfferActive()) return { id: null, selections: [] }
  try {
    const stored = JSON.parse(localStorage.getItem(OFFER_KEY) || 'null')
    if (!stored?.id || !FESTIVAL_OFFERS[stored.id]) return { id: null, selections: [] }
    return {
      id: stored.id,
      selections: Array.isArray(stored.selections) ? stored.selections : []
    }
  } catch {
    return { id: null, selections: [] }
  }
}

function clampSelections(cartItems, offerId, selections) {
  const required = FESTIVAL_OFFERS[offerId]?.required ?? 0
  if (!offerId || required <= 0) return []
  const next = []
  let used = 0
  for (const sel of selections || []) {
    const line = cartItems.find(
      (item) => String(item.productId) === String(sel.productId) && item.size === sel.size
    )
    if (!line) continue
    const room = required - used
    const qty = Math.min(line.quantity, Math.max(0, Math.floor(Number(sel.quantity) || 0)), room)
    if (qty <= 0) continue
    used += qty
    next.push({ productId: line.productId, size: line.size, quantity: qty })
  }
  const same = next.length === (selections || []).length
    && next.every((sel, i) =>
      String(sel.productId) === String(selections[i]?.productId)
      && sel.size === selections[i]?.size
      && sel.quantity === selections[i]?.quantity
    )
  return same ? selections : next
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
  const [festivalOfferId, setFestivalOfferId] = useState(() => readStoredOffer().id)
  const [festivalSelections, setFestivalSelections] = useState(() => readStoredOffer().selections)
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

  const safeSelections = clampSelections(items, festivalOfferId, festivalSelections)

  useEffect(() => {
    if (!isFestivalOfferActive() || !festivalOfferId) {
      localStorage.removeItem(OFFER_KEY)
      return
    }
    localStorage.setItem(OFFER_KEY, JSON.stringify({
      id: festivalOfferId,
      selections: safeSelections
    }))
  }, [festivalOfferId, safeSelections])

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
  const activeOfferId = festivalActive ? festivalOfferId : null
  const festivalQuote = quoteFestivalOffer(
    items,
    activeOfferId,
    activeOfferId ? safeSelections : []
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
    setFestivalOfferId(null)
    setFestivalSelections([])
  }

  const selectFestivalOffer = (id) => {
    if (!isFestivalOfferActive() || !FESTIVAL_OFFERS[id]) return
    setFestivalOfferId(id)
    setFestivalSelections([])
  }

  const clearFestivalOffer = () => {
    setFestivalOfferId(null)
    setFestivalSelections([])
  }

  const setFestivalIncluded = (productId, size, quantity) => {
    setFestivalSelections((prev) => {
      const required = FESTIVAL_OFFERS[festivalOfferId]?.required ?? 0
      const others = clampSelections(items, festivalOfferId, prev).filter(
        (sel) => !(String(sel.productId) === String(productId) && sel.size === size)
      )
      const used = others.reduce((sum, sel) => sum + sel.quantity, 0)
      const line = items.find(
        (item) => String(item.productId) === String(productId) && item.size === size
      )
      const max = Math.min(line?.quantity || 0, Math.max(0, required - used))
      const qty = Math.max(0, Math.min(max, Math.floor(Number(quantity) || 0)))
      if (!line || qty <= 0) return others
      return [...others, { productId: line.productId, size: line.size, quantity: qty }]
    })
  }

  const applyBestFestivalSelection = () => {
    if (!activeOfferId) return
    setFestivalSelections(bestFestivalSelection(items, activeOfferId))
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
  // Shipping fee disabled for now — always FREE
  // const shippingCost = calculateShipping(cartTotal)
  const shippingCost = 0
  const tax = 0 // GST disabled for now
  // Whole rupees only — drop paise (1399.1 → 1399)
  const orderTotal = Math.max(
    0,
    Math.floor(cartTotal - discountAmount + shippingCost + tax + 1e-9)
  )
  const festivalCheckoutReady = !activeOfferId || (festivalQuote.ok && festivalQuote.applied)

  return (
    <CartContext.Provider value={{
      items, addToCart, updateQuantity, removeFromCart, clearCart,
      cartTotal, cartCount, shippingCost, tax, orderTotal,
      discountAmount, welcomeDiscount, couponDiscount, newCustomerEligible,
      appliedCoupon, applyCoupon, removeCoupon, couponLoading,
      festivalActive, festivalOfferId: activeOfferId, festivalSelections: safeSelections, festivalQuote,
      festivalDiscount, festivalCheckoutReady,
      selectFestivalOffer, clearFestivalOffer, setFestivalIncluded, applyBestFestivalSelection
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
