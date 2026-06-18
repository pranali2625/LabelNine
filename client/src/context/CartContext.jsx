import { createContext, useContext, useState, useEffect } from 'react'
import toast from 'react-hot-toast'

const CartContext = createContext(null)

const CART_KEY = 'ln_cart'

export function CartProvider({ children }) {
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

  const clearCart = () => setItems([])

  const cartTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0)
  // const shippingCost = cartTotal >= 499 ? 0 : 79
  const shippingCost = 0 // shipping disabled for now
  const tax = 0 // GST disabled for now
  const orderTotal = cartTotal + shippingCost + tax

  return (
    <CartContext.Provider value={{
      items, addToCart, updateQuantity, removeFromCart, clearCart,
      cartTotal, cartCount, shippingCost, tax, orderTotal
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
