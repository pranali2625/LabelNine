import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { SlidersHorizontal, X } from 'lucide-react'
import api from '../services/api'
import ImageSlideshow from '../components/ImageSlideshow'

const SIZES = ['M', 'L', 'XL', 'XXL']
const SORTS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'popular', label: 'Most Popular' }
]

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [varieties, setVarieties] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [filterOpen, setFilterOpen] = useState(false)

  const variety = searchParams.get('variety') || ''
  const sort = searchParams.get('sort') || 'newest'
  const size = searchParams.get('size') || ''
  const page = parseInt(searchParams.get('page') || '1')

  useEffect(() => {
    api.get('/products?limit=100', {
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
    })
      .then(res => {
        const list = Array.isArray(res.data?.products) ? res.data.products : []
        const unique = [...new Set(list.map((p) => p.variety).filter(Boolean))].sort()
        setVarieties(unique)
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ sort, page, limit: 12 })
        if (variety) params.append('variety', variety)
        if (size) params.append('size', size)
        const { data } = await api.get(`/products?${params}`, {
          headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
        })
        setProducts(Array.isArray(data?.products) ? data.products : [])
        setTotal(data?.total ?? 0)
        setPages(data?.pages ?? 1)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [variety, sort, size, page])

  const setParam = (key, value) => {
    const p = new URLSearchParams(searchParams)
    if (value) p.set(key, value); else p.delete(key)
    p.delete('page')
    setSearchParams(p)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {variety || 'All Shirts'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">{total} {total === 1 ? 'product' : 'products'}</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={sort}
            onChange={e => setParam('sort', e.target.value)}
            className="text-sm border border-gray-300 px-3 py-2 focus:outline-none focus:border-black"
          >
            {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className="flex items-center gap-2 border border-gray-300 px-3 py-2 text-sm hover:border-black transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" /> Filters
          </button>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Sidebar filters */}
        <aside className={`${filterOpen ? 'block' : 'hidden'} md:block w-56 flex-shrink-0`}>
          <div className="sticky top-24 space-y-6">
            {/* Variety filter */}
            {varieties.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold tracking-wider mb-3">CATEGORY</h3>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="variety" checked={!variety} onChange={() => setParam('variety', '')} className="accent-black" />
                  <span className="text-sm">All</span>
                </label>
                {varieties.map(v => (
                  <label key={v} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="variety" checked={variety === v} onChange={() => setParam('variety', v)} className="accent-black" />
                    <span className="text-sm">{v}</span>
                  </label>
                ))}
              </div>
            </div>
            )}

            {/* Size filter */}
            <div>
              <h3 className="text-sm font-semibold tracking-wider mb-3">SIZE</h3>
              <div className="flex flex-wrap gap-2">
                {SIZES.map(s => (
                  <button
                    key={s}
                    onClick={() => setParam('size', size === s ? '' : s)}
                    className={`w-10 h-10 text-sm border font-medium transition-colors ${size === s ? 'bg-black text-white border-black' : 'border-gray-300 hover:border-black'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {(variety || size) && (
              <button
                onClick={() => setSearchParams({})}
                className="flex items-center gap-1 text-xs text-red-600 hover:underline"
              >
                <X className="w-3 h-3" /> Clear all filters
              </button>
            )}
          </div>
        </aside>

        {/* Product grid */}
        <div className="flex-1">
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-200 aspect-[3/4] mb-3" />
                  <div className="h-4 bg-gray-200 rounded mb-2 w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : !products?.length ? (
            <div className="text-center py-20 text-gray-500">
              <p className="text-lg font-medium">No products found</p>
              <p className="text-sm mt-2">Try changing your filters</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {products.map(product => <ProductCard key={product._id} product={product} />)}
              </div>

              {/* Pagination */}
              {pages > 1 && (
                <div className="flex justify-center gap-2 mt-10">
                  {[...Array(pages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setParam('page', String(i + 1))}
                      className={`w-10 h-10 text-sm font-medium border transition-colors ${page === i + 1 ? 'bg-black text-white border-black' : 'border-gray-300 hover:border-black'}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
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
        {product.totalStock === 0 && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
            <span className="text-sm font-semibold text-gray-500">OUT OF STOCK</span>
          </div>
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
