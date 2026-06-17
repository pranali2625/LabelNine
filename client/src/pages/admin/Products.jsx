import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, Package, X, Check } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

const VARIETIES = ['Classic White Formal', 'Oxford Button-Down', 'Slim Fit Solid', 'Casual Linen', 'Printed Heritage']
const SIZES = ['M', 'L', 'XL', 'XXL']
const FITS = ['Regular', 'Slim', 'Relaxed', 'Oversized']

const emptyProduct = {
  name: '', variety: '', description: '', price: '', discountedPrice: '',
  fabric: '', fit: 'Regular', color: '',
  images: [{ url: '' }],
  sizes: SIZES.map(s => ({ size: s, stock: 0 })),
  isFeatured: false, isActive: true
}

export default function AdminProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'add' | 'edit' | 'stock'
  const [form, setForm] = useState(emptyProduct)
  const [saving, setSaving] = useState(false)

  const fetchProducts = () => {
    setLoading(true)
    api.get('/admin/products')
      .then(res => setProducts(res.data.products))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchProducts() }, [])

  const openAdd = () => { setForm(emptyProduct); setModal('add') }
  const openEdit = (p) => {
    setForm({
      ...p,
      price: p.price.toString(),
      discountedPrice: p.discountedPrice?.toString() || '',
      images: p.images.length ? p.images : [{ url: '' }],
      sizes: SIZES.map(s => {
        const existing = p.sizes.find(x => x.size === s)
        return { size: s, stock: existing?.stock || 0 }
      })
    })
    setModal('edit')
  }
  const openStock = (p) => { setForm({ ...p, sizes: SIZES.map(s => ({ size: s, stock: p.sizes.find(x => x.size === s)?.stock || 0 })) }); setModal('stock') }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleStockChange = (size, stock) => {
    setForm(prev => ({ ...prev, sizes: prev.sizes.map(s => s.size === size ? { ...s, stock: parseInt(stock) || 0 } : s) }))
  }

  const handleImageChange = (index, value) => {
    setForm(prev => {
      const images = [...prev.images]
      images[index] = { url: value }
      return { ...prev, images }
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        variety: form.variety,
        description: form.description,
        price: parseFloat(form.price),
        discountedPrice: form.discountedPrice !== '' && form.discountedPrice != null
          ? parseFloat(form.discountedPrice)
          : null,
        fabric: form.fabric || null,
        fit: form.fit || null,
        color: form.color || null,
        care: form.care || [],
        tags: form.tags || [],
        images: form.images.filter(i => i.url),
        sizes: form.sizes,
        isFeatured: !!form.isFeatured,
        isActive: form.isActive !== false
      }

      if (modal === 'add') {
        await api.post('/products', payload)
        toast.success('Product created')
      } else if (modal === 'edit') {
        await api.put(`/products/${form._id}`, payload)
        toast.success('Product updated')
      } else if (modal === 'stock') {
        await api.patch(`/products/${form._id}/stock`, { sizes: form.sizes })
        toast.success('Stock updated')
      }

      setModal(null)
      fetchProducts()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Deactivate this product?')) return
    try {
      await api.delete(`/products/${id}`)
      toast.success('Product deactivated')
      fetchProducts()
    } catch {
      toast.error('Failed to deactivate')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Products ({products.length})</h2>
        <button onClick={openAdd} className="flex items-center gap-2 bg-black text-white px-4 py-2 text-sm font-semibold hover:bg-gray-800 transition-colors">
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[...Array(6)].map((_, i) => <div key={i} className="bg-white border h-48" />)}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-xs tracking-wider">PRODUCT</th>
                <th className="text-left px-4 py-3 font-semibold text-xs tracking-wider">VARIETY</th>
                <th className="text-left px-4 py-3 font-semibold text-xs tracking-wider">PRICE</th>
                <th className="text-left px-4 py-3 font-semibold text-xs tracking-wider">STOCK</th>
                <th className="text-left px-4 py-3 font-semibold text-xs tracking-wider">STATUS</th>
                <th className="text-left px-4 py-3 font-semibold text-xs tracking-wider">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p._id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img src={p.images[0]?.url} alt="" className="w-10 h-12 object-cover bg-gray-100 flex-shrink-0" />
                      <div>
                        <p className="font-medium">{p.name}</p>
                        {p.isFeatured && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Featured</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{p.variety}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold">₹{p.discountedPrice || p.price}</p>
                    {p.discountedPrice && <p className="text-xs text-gray-400 line-through">₹{p.price}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <p className={`font-medium ${p.totalStock <= 10 ? 'text-red-600' : 'text-green-700'}`}>{p.totalStock}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {p.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-gray-100 rounded transition-colors" title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => openStock(p)} className="p-1.5 hover:bg-gray-100 rounded transition-colors" title="Update Stock">
                        <Package className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(p._id)} className="p-1.5 hover:bg-red-50 text-red-500 rounded transition-colors" title="Deactivate">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h3 className="font-bold">
                {modal === 'add' ? 'Add Product' : modal === 'edit' ? 'Edit Product' : 'Update Stock'}
              </h3>
              <button onClick={() => setModal(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {modal !== 'stock' ? (
                <>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold tracking-wider text-gray-600 mb-1">NAME *</label>
                      <input name="name" value={form.name} onChange={handleChange} className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-black" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold tracking-wider text-gray-600 mb-1">VARIETY *</label>
                      <select name="variety" value={form.variety} onChange={handleChange} className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-black bg-white">
                        <option value="">Select variety</option>
                        {VARIETIES.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold tracking-wider text-gray-600 mb-1">PRICE (₹) *</label>
                      <input name="price" type="number" value={form.price} onChange={handleChange} className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-black" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold tracking-wider text-gray-600 mb-1">DISCOUNTED PRICE (₹)</label>
                      <input name="discountedPrice" type="number" value={form.discountedPrice} onChange={handleChange} className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-black" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold tracking-wider text-gray-600 mb-1">FABRIC</label>
                      <input name="fabric" value={form.fabric} onChange={handleChange} className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-black" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold tracking-wider text-gray-600 mb-1">FIT</label>
                      <select name="fit" value={form.fit} onChange={handleChange} className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-black bg-white">
                        {FITS.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold tracking-wider text-gray-600 mb-1">COLOR</label>
                      <input name="color" value={form.color} onChange={handleChange} className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-black" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold tracking-wider text-gray-600 mb-1">DESCRIPTION *</label>
                    <textarea name="description" value={form.description} onChange={handleChange} rows={3} className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-black resize-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold tracking-wider text-gray-600 mb-1">IMAGE URL</label>
                    <input value={form.images[0]?.url || ''} onChange={e => handleImageChange(0, e.target.value)} placeholder="https://..." className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-black" />
                  </div>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" name="isFeatured" checked={form.isFeatured} onChange={handleChange} className="accent-black" />
                      <span className="text-sm">Featured</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} className="accent-black" />
                      <span className="text-sm">Active</span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold tracking-wider text-gray-600 mb-2">INITIAL STOCK BY SIZE</label>
                    <div className="flex flex-wrap gap-3">
                      {form.sizes.map(({ size, stock }) => (
                        <div key={size} className="flex flex-col items-center gap-1">
                          <span className="text-xs font-bold">{size}</span>
                          <input type="number" min={0} value={stock} onChange={e => handleStockChange(size, e.target.value)} className="w-16 border border-gray-300 px-2 py-1.5 text-sm text-center focus:outline-none focus:border-black" />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <p className="font-semibold mb-1">{form.name}</p>
                  <p className="text-sm text-gray-500 mb-4">Update stock quantity for each size</p>
                  <div className="flex flex-wrap gap-4">
                    {form.sizes.map(({ size, stock }) => (
                      <div key={size} className="flex flex-col items-center gap-2">
                        <span className="text-sm font-bold">{size}</span>
                        <input type="number" min={0} value={stock} onChange={e => handleStockChange(size, e.target.value)} className="w-20 border border-gray-300 px-2 py-2 text-sm text-center focus:outline-none focus:border-black" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-5 border-t border-gray-200">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm border border-gray-300 hover:border-black transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-black text-white hover:bg-gray-800 transition-colors disabled:opacity-60 flex items-center gap-2">
                {saving ? 'Saving...' : <><Check className="w-4 h-4" /> Save</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
