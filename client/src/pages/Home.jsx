import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Truck, Shield, RotateCcw } from 'lucide-react'
import api from '../services/api'
import ImageSlideshow from '../components/ImageSlideshow'

const VARIETIES = [
  'Classic White Formal',
  'Oxford Button-Down',
  'Slim Fit Solid',
  'Casual Linen',
  'Printed Heritage'
]

export default function Home() {
  const [featured, setFeatured] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/products?featured=true&limit=4', {
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
    })
      .then(res => setFeatured(Array.isArray(res.data?.products) ? res.data.products : []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      {/* Hero */}
      <section className="bg-black text-white min-h-[90vh] flex items-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent z-10" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1602810316693-3667c854239a?w=1400')] bg-cover bg-center opacity-40" />
        <div className="relative z-20 max-w-7xl mx-auto px-6 py-24">
          <p className="text-amber-400 text-sm tracking-[0.4em] mb-4 font-medium">PREMIUM MEN'S SHIRTS</p>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight tracking-tight">
            DRESS WITH<br />
            <span className="text-amber-400">PURPOSE.</span>
          </h1>
          <p className="text-gray-300 text-lg md:text-xl mb-10 max-w-lg leading-relaxed">
            Five handcrafted shirt varieties, each designed for the modern Indian man who values quality over quantity.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/shop" className="inline-flex items-center gap-2 bg-white text-black px-8 py-4 font-semibold tracking-wide hover:bg-amber-400 transition-colors duration-200">
              SHOP NOW <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/track" className="inline-flex items-center gap-2 border border-white text-white px-8 py-4 font-semibold tracking-wide hover:bg-white hover:text-black transition-colors duration-200">
              TRACK ORDER
            </Link>
          </div>
        </div>
      </section>

      {/* Varieties strip */}
      <section className="bg-amber-400 py-4 overflow-x-auto">
        <div className="flex items-center gap-8 px-6 min-w-max mx-auto">
          {VARIETIES.map((v, i) => (
            <Link key={v} to={`/shop?variety=${encodeURIComponent(v)}`} className="text-black text-xs font-semibold tracking-[0.25em] hover:underline whitespace-nowrap">
              {v.toUpperCase()}
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="flex items-center justify-between mb-10">
          <div>
            <p className="text-xs tracking-[0.3em] text-gray-500 mb-1">HANDPICKED</p>
            <h2 className="text-3xl font-bold tracking-tight">FEATURED SHIRTS</h2>
          </div>
          <Link to="/shop" className="flex items-center gap-2 text-sm font-medium tracking-wide hover:gap-3 transition-all">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 aspect-[3/4] mb-3" />
                <div className="h-4 bg-gray-200 rounded mb-2 w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {featured.map(product => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* Brand story */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs tracking-[0.3em] text-gray-500 mb-2">OUR STORY</p>
              <h2 className="text-3xl font-bold mb-6 tracking-tight">CRAFTED FOR THE<br />MODERN MAN</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Label Nine was born from a simple belief — that a great shirt is the foundation of every great outfit. We create exactly five varieties of men's shirts, each perfected over time, each serving a distinct purpose in your wardrobe.
              </p>
              <p className="text-gray-600 leading-relaxed mb-8">
                From crisp formal whites to breathable linen for Indian summers, every Label Nine shirt is crafted with premium fabrics and meticulous attention to detail.
              </p>
              <Link to="/shop" className="inline-flex items-center gap-2 bg-black text-white px-6 py-3 font-semibold text-sm tracking-wide hover:bg-gray-800 transition-colors">
                EXPLORE COLLECTION <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="aspect-[3/4] bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=400')" }} />
              <div className="aspect-[3/4] bg-cover bg-center mt-8" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1607345366928-199ea26cfe3e?w=400')" }} />
            </div>
          </div>
        </div>
      </section>

      {/* Trust badges */}
      <section className="border-t border-b border-gray-200 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center gap-3">
              <Truck className="w-8 h-8" />
              <div>
                <p className="font-semibold text-sm tracking-wide">FREE HOME DELIVERY</p>
                <p className="text-gray-500 text-sm">On orders above ₹499</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-3">
              <Shield className="w-8 h-8" />
              <div>
                <p className="font-semibold text-sm tracking-wide">CASH ON DELIVERY</p>
                <p className="text-gray-500 text-sm">Pay when your order arrives</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-3">
              <RotateCcw className="w-8 h-8" />
              <div>
                <p className="font-semibold text-sm tracking-wide">EASY RETURNS</p>
                <p className="text-gray-500 text-sm">7-day hassle-free returns</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Varieties grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-10">
          <p className="text-xs tracking-[0.3em] text-gray-500 mb-1">THE COLLECTION</p>
          <h2 className="text-3xl font-bold tracking-tight">5 VARIETIES. 1 BRAND.</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {VARIETIES.map((variety, i) => (
            <Link
              key={variety}
              to={`/shop?variety=${encodeURIComponent(variety)}`}
              className="group relative aspect-[3/4] bg-gray-100 overflow-hidden"
            >
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors z-10" />
              <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
                <p className="text-white text-xs font-semibold tracking-wider leading-tight">{variety.toUpperCase()}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

function ProductCard({ product }) {
  return (
    <Link to={`/shop/${product.slug || product._id}`} className="group">
      <div className="relative mb-3">
        <ImageSlideshow
          images={product.images}
          alt={product.name}
          hoverPlay
          showDots
          showArrows={false}
          imgClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {product.discountedPrice && (
          <span className="absolute top-2 left-2 bg-black text-white text-xs px-2 py-1 font-medium z-10">
            {Math.round((1 - product.discountedPrice / product.price) * 100)}% OFF
          </span>
        )}
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-1">{product.variety}</p>
        <p className="font-semibold text-sm mb-1 group-hover:underline">{product.name}</p>
        <div className="flex items-center gap-2">
          <span className="font-bold">₹{product.discountedPrice || product.price}</span>
          {product.discountedPrice && (
            <span className="text-gray-400 line-through text-sm">₹{product.price}</span>
          )}
        </div>
      </div>
    </Link>
  )
}
