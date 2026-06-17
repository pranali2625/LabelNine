import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ShoppingBag } from 'lucide-react'
import ImageSlideshow from '../components/ImageSlideshow'
import api from '../services/api'
import { useCart } from '../context/CartContext'
import toast from 'react-hot-toast'

const AVAILABLE_SIZES = ['M', 'L', 'XL', 'XXL']

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToCart } = useCart()

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedSize, setSelectedSize] = useState('')

  useEffect(() => {
    api.get(`/products/${id}`)
      .then(res => setProduct(res.data.product))
      .catch(() => navigate('/shop'))
      .finally(() => setLoading(false))
  }, [id])

  const handleAddToCart = () => {
    if (!selectedSize) {
      toast.error('Please select a size')
      return
    }
    const sizeEntry = product.sizes.find(s => s.size === selectedSize)
    if (!sizeEntry || sizeEntry.stock === 0) {
      toast.error('Selected size is out of stock')
      return
    }
    addToCart(product, selectedSize)
  }

  const handleBuyNow = () => {
    if (!selectedSize) { toast.error('Please select a size'); return }
    addToCart(product, selectedSize)
    navigate('/cart')
  }

  if (loading) return (
    <div className="max-w-7xl mx-auto px-4 py-10 animate-pulse">
      <div className="grid md:grid-cols-2 gap-10">
        <div className="aspect-[3/4] bg-gray-200" />
        <div className="space-y-4 pt-4">
          <div className="h-6 bg-gray-200 w-1/3 rounded" />
          <div className="h-8 bg-gray-200 w-2/3 rounded" />
          <div className="h-6 bg-gray-200 w-1/4 rounded" />
        </div>
      </div>
    </div>
  )

  if (!product) return null

  const displayPrice = product.discountedPrice || product.price
  const discount = product.discountedPrice
    ? Math.round((1 - product.discountedPrice / product.price) * 100)
    : null

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="grid md:grid-cols-2 gap-10 lg:gap-16">
        <ImageSlideshow
          images={product.images}
          alt={product.name}
          autoPlay
          showThumbnails
          showDots
        />

        {/* Details */}
        <div className="pt-2">
          <p className="text-xs text-gray-500 tracking-[0.2em] mb-2">{product.variety}</p>
          <h1 className="text-2xl md:text-3xl font-bold mb-3">{product.name}</h1>

          {/* Price */}
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl font-bold">₹{displayPrice}</span>
            {product.discountedPrice && (
              <>
                <span className="text-gray-400 line-through text-lg">₹{product.price}</span>
                <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-1">{discount}% OFF</span>
              </>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-6">Inclusive of all taxes • Free delivery above ₹499</p>

          {/* Size selection */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold tracking-wider">SELECT SIZE</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {product.sizes
                .filter(({ size }) => AVAILABLE_SIZES.includes(size))
                .map(({ size, stock }) => (
                <button
                  key={size}
                  disabled={stock === 0}
                  onClick={() => setSelectedSize(size)}
                  className={`w-12 h-12 text-sm font-medium border transition-all relative
                    ${stock === 0 ? 'border-gray-200 text-gray-300 cursor-not-allowed line-through' : ''}
                    ${selectedSize === size ? 'bg-black text-white border-black' : stock > 0 ? 'border-gray-300 hover:border-black' : ''}
                  `}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* CTA buttons */}
          <div className="space-y-3 mb-8">
            <button onClick={handleBuyNow} className="w-full bg-black text-white py-4 font-semibold tracking-wide hover:bg-gray-800 transition-colors">
              BUY NOW
            </button>
            <button onClick={handleAddToCart} className="w-full border border-black text-black py-4 font-semibold tracking-wide hover:bg-black hover:text-white transition-colors flex items-center justify-center gap-2">
              <ShoppingBag className="w-5 h-5" /> ADD TO CART
            </button>
          </div>

          {/* Product info */}
          <div className="space-y-4 border-t border-gray-200 pt-6">
            <div>
              <h3 className="text-sm font-semibold tracking-wider mb-2">DESCRIPTION</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{product.description}</p>
            </div>
            {product.fabric && (
              <div>
                <h3 className="text-sm font-semibold tracking-wider mb-2">FABRIC</h3>
                <p className="text-gray-600 text-sm">{product.fabric}</p>
              </div>
            )}
            {product.care?.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold tracking-wider mb-2">CARE INSTRUCTIONS</h3>
                <ul className="text-gray-600 text-sm space-y-1">
                  {product.care.map((c, i) => <li key={i}>• {c}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
