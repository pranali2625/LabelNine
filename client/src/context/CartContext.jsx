import { createContext, useContext, useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { calculateShipping, calculateNewCustomerDiscount } from '../constants/pricing'
import { useAuth } from './AuthContext'
import api from '../services/api'

const CartContext = createContext(null)

const CART_KEY = 'ln_cart'

export function CartProvider({ children }) {
  const { user } = useAuth()
  const [newCustomerEligible, setNewCustomerEligible] = useState(false)
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
    let cancelled = false
    const checkDiscount = async () => {
      if (!user) {
        setNewCustomerEligible(false)
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
  }

  const cartTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0)
  const discountAmount = calculateNewCustomerDiscount(cartTotal, newCustomerEligible)
  const shippingCost = calculateShipping(cartTotal)
  const tax = 0 // GST disabled for now
  const orderTotal = cartTotal - discountAmount + shippingCost + tax

  return (
    <CartContext.Provider value={{
      items, addToCart, updateQuantity, removeFromCart, clearCart,
      cartTotal, cartCount, shippingCost, tax, orderTotal,
      discountAmount, newCustomerEligible
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
