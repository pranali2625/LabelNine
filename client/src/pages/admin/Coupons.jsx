import { useEffect, useState } from 'react'
import { Plus, Trash2, Ticket, ChevronDown, ChevronRight } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

const emptyCreate = {
  code: '',
  discountPercent: 10,
  isPublic: false,
  firstOrderOnly: true
}
const emptyCustomer = { email: '', phone: '' }

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([])
  const [allProducts, setAllProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [createForm, setCreateForm] = useState(emptyCreate)
  const [expanded, setExpanded] = useState(null)
  const [customers, setCustomers] = useState([])
  const [customersLoading, setCustomersLoading] = useState(false)
  const [customerForm, setCustomerForm] = useState(emptyCustomer)
  const [addingCustomer, setAddingCustomer] = useState(false)
  const [toggling, setToggling] = useState(null)
  const [removing, setRemoving] = useState(null)
  const [selectedProductIds, setSelectedProductIds] = useState([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [savingProducts, setSavingProducts] = useState(false)
  const [productSearch, setProductSearch] = useState('')

  const fetchCoupons = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/coupons')
      setCoupons(data.coupons || [])
    } catch {
      toast.error('Failed to load coupons')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCoupons()
    api
      .get('/admin/products')
      .then(({ data }) => setAllProducts(data.products || []))
      .catch(() => {})
  }, [])

  const loadCustomers = async (code) => {
    setCustomersLoading(true)
    try {
      const { data } = await api.get(`/admin/coupons/${encodeURIComponent(code)}/customers`)
      setCustomers(data.customers || [])
    } catch {
      toast.error('Failed to load customers')
      setCustomers([])
    } finally {
      setCustomersLoading(false)
    }
  }

  const loadCouponProducts = async (code) => {
    setProductsLoading(true)
    try {
      const { data } = await api.get(`/admin/coupons/${encodeURIComponent(code)}/products`)
      setSelectedProductIds((data.productIds || []).map(Number))
    } catch {
      toast.error('Failed to load coupon products')
      setSelectedProductIds([])
    } finally {
      setProductsLoading(false)
    }
  }

  const toggleExpand = async (code) => {
    if (expanded === code) {
      setExpanded(null)
      setCustomers([])
      setSelectedProductIds([])
      setProductSearch('')
      return
    }
    setExpanded(code)
    setCustomerForm(emptyCustomer)
    setProductSearch('')
    const coupon = coupons.find((c) => c.code === code)
    await loadCouponProducts(code)
    if (!coupon?.isPublic) {
      await loadCustomers(code)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      await api.post('/admin/coupons', {
        code: createForm.code.trim(),
        discountPercent: Number(createForm.discountPercent),
        isPublic: createForm.isPublic,
        firstOrderOnly: createForm.isPublic ? createForm.firstOrderOnly : true
      })
      toast.success('Coupon created — open it to select products')
      setCreateForm(emptyCreate)
      fetchCoupons()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create coupon')
    } finally {
      setCreating(false)
    }
  }

  const handleToggleActive = async (coupon) => {
    setToggling(coupon.code)
    try {
      const { data } = await api.patch(`/admin/coupons/${encodeURIComponent(coupon.code)}`, {
        isActive: !coupon.isActive
      })
      setCoupons((prev) =>
        prev.map((c) => (c.code === coupon.code ? { ...c, isActive: data.coupon.isActive } : c))
      )
      toast.success(data.coupon.isActive ? 'Coupon activated' : 'Coupon deactivated')
    } catch {
      toast.error('Failed to update coupon')
    } finally {
      setToggling(null)
    }
  }

  const handleAddCustomer = async (e) => {
    e.preventDefault()
    if (!expanded) return
    setAddingCustomer(true)
    try {
      await api.post(`/admin/coupons/${encodeURIComponent(expanded)}/customers`, {
        email: customerForm.email.trim() || undefined,
        phone: customerForm.phone.trim() || undefined
      })
      toast.success('Customer added')
      setCustomerForm(emptyCustomer)
      await loadCustomers(expanded)
      fetchCoupons()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add customer')
    } finally {
      setAddingCustomer(false)
    }
  }

  const handleRemoveCustomer = async (customerId) => {
    if (!expanded) return
    setRemoving(customerId)
    try {
      await api.delete(`/admin/coupons/${encodeURIComponent(expanded)}/customers/${customerId}`)
      toast.success('Customer removed')
      setCustomers((prev) => prev.filter((c) => c.id !== customerId))
      fetchCoupons()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove customer')
    } finally {
      setRemoving(null)
    }
  }

  const toggleProduct = (productId) => {
    const id = Number(productId)
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleSaveProducts = async () => {
    if (!expanded) return
    setSavingProducts(true)
    try {
      const { data } = await api.put(`/admin/coupons/${encodeURIComponent(expanded)}/products`, {
        productIds: selectedProductIds
      })
      const current = coupons.find((c) => c.code === expanded)
      setCoupons((prev) =>
        prev.map((c) =>
          c.code === expanded ? { ...c, productCount: data.productCount } : c
        )
      )
      toast.success(
        data.appliesToAll
          ? current?.isPublic
            ? 'Saved — select products before customers can use this code'
            : 'Saved — coupon applies to all products'
          : `Saved — ${data.productCount} product${data.productCount === 1 ? '' : 's'} selected`
      )
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save products')
    } finally {
      setSavingProducts(false)
    }
  }

  const filteredProducts = allProducts.filter((p) => {
    const q = productSearch.trim().toLowerCase()
    if (!q) return true
    return (
      String(p.name || '').toLowerCase().includes(q) ||
      String(p.variety || '').toLowerCase().includes(q)
    )
  })

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold">Coupons</h2>
          <p className="text-sm text-gray-500 mt-1">
            Create a code, then select which products it applies to. Leave none selected to apply to
            all products.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleCreate}
        className="bg-white border border-gray-200 p-4 mb-6 space-y-3"
      >
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-500 mb-1">CODE</label>
            <input
              value={createForm.code}
              onChange={(e) => setCreateForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              placeholder="FREEDOM15"
              className="w-full border border-gray-300 px-3 py-2 text-sm uppercase tracking-wide focus:outline-none focus:border-black"
              required
              minLength={3}
            />
          </div>
          <div className="w-full sm:w-28">
            <label className="block text-xs font-semibold text-gray-500 mb-1">% OFF</label>
            <input
              type="number"
              min={1}
              max={100}
              value={createForm.discountPercent}
              onChange={(e) => setCreateForm((f) => ({ ...f, discountPercent: e.target.value }))}
              className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-black"
              required
            />
          </div>
          <button
            type="submit"
            disabled={creating}
            className="bg-black text-white px-4 py-2 text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {creating ? 'Creating…' : 'Create'}
          </button>
        </div>
        <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-gray-700">
          <input
            type="checkbox"
            checked={createForm.isPublic}
            onChange={(e) =>
              setCreateForm((f) => ({
                ...f,
                isPublic: e.target.checked,
                firstOrderOnly: e.target.checked ? false : true
              }))
            }
          />
          Public (all signed-in users, no allowlist)
        </label>
      </form>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white border h-16" />
          ))}
        </div>
      ) : coupons.length === 0 ? (
        <div className="bg-white border border-gray-200 text-center py-16 text-gray-500 text-sm">
          <Ticket className="w-8 h-8 mx-auto mb-3 text-gray-300" />
          No coupons yet. Create one above.
        </div>
      ) : (
        <div className="space-y-3">
          {coupons.map((coupon) => {
            const isOpen = expanded === coupon.code
            return (
              <div key={coupon.id} className="bg-white border border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleExpand(coupon.code)}
                    className="flex items-center gap-2 text-left flex-1 min-w-0"
                  >
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="font-bold tracking-wide">{coupon.code}</p>
                      <p className="text-xs text-gray-500">
                        {coupon.discountPercent}% off
                        {coupon.isPublic ? ' · public' : ' · invite only'}
                        {' · '}
                        {coupon.productCount > 0
                          ? `${coupon.productCount} product${coupon.productCount === 1 ? '' : 's'}`
                          : coupon.isPublic
                            ? 'no products selected'
                            : 'all products'}
                        {coupon.firstOrderOnly ? ' · first order only' : ''}
                        {!coupon.isPublic && (
                          <>
                            {' · '}
                            {coupon.customerCount} customer{coupon.customerCount === 1 ? '' : 's'}
                            {' · '}
                            {coupon.usedCount} used
                          </>
                        )}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-2 sm:ml-auto">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        coupon.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {coupon.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(coupon)}
                      disabled={toggling === coupon.code}
                      className="text-xs border border-gray-300 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {coupon.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-gray-200 px-4 py-4 bg-gray-50 space-y-6">
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                        <div>
                          <h3 className="text-sm font-semibold">Products this coupon applies to</h3>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {coupon.isPublic
                              ? selectedProductIds.length === 0
                                ? 'Select at least one product (required for public sale codes)'
                                : `${selectedProductIds.length} selected`
                              : selectedProductIds.length === 0
                                ? 'None selected = applies to every product'
                                : `${selectedProductIds.length} selected`}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedProductIds([])}
                            className="text-xs border border-gray-300 px-3 py-1.5 hover:bg-white"
                          >
                            {coupon.isPublic ? 'Clear selection' : 'Clear (all products)'}
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveProducts}
                            disabled={savingProducts || productsLoading}
                            className="text-xs bg-black text-white px-3 py-1.5 font-semibold hover:bg-gray-800 disabled:opacity-50"
                          >
                            {savingProducts ? 'Saving…' : 'Save products'}
                          </button>
                        </div>
                      </div>

                      <input
                        type="search"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        placeholder="Search products…"
                        className="w-full mb-2 border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:border-black"
                      />

                      {productsLoading ? (
                        <p className="text-xs text-gray-400">Loading…</p>
                      ) : filteredProducts.length === 0 ? (
                        <p className="text-xs text-gray-500">No products found.</p>
                      ) : (
                        <div className="bg-white border border-gray-200 max-h-64 overflow-y-auto">
                          {filteredProducts.map((p) => {
                            const id = Number(p._id || p.id)
                            const checked = selectedProductIds.includes(id)
                            return (
                              <label
                                key={id}
                                className="flex items-center gap-3 px-3 py-2 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleProduct(id)}
                                />
                                <span className="text-sm flex-1 min-w-0 truncate">{p.name}</span>
                                <span className="text-xs text-gray-400 shrink-0">
                                  ₹{p.discountedPrice || p.price}
                                  {p.discountedPrice ? ' (sale)' : ''}
                                </span>
                              </label>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {!coupon.isPublic && (
                      <div>
                        <h3 className="text-sm font-semibold mb-3">Allowlisted customers</h3>

                        <form
                          onSubmit={handleAddCustomer}
                          className="flex flex-col sm:flex-row gap-2 mb-4"
                        >
                          <input
                            type="email"
                            value={customerForm.email}
                            onChange={(e) =>
                              setCustomerForm((f) => ({ ...f, email: e.target.value }))
                            }
                            placeholder="Email"
                            className="flex-1 border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:border-black"
                          />
                          <input
                            type="tel"
                            value={customerForm.phone}
                            onChange={(e) =>
                              setCustomerForm((f) => ({
                                ...f,
                                phone: e.target.value.replace(/\D/g, '').slice(0, 10)
                              }))
                            }
                            placeholder="Phone"
                            className="sm:w-36 border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:border-black"
                          />
                          <button
                            type="submit"
                            disabled={addingCustomer}
                            className="bg-black text-white px-4 py-2 text-sm font-semibold hover:bg-gray-800 disabled:opacity-50"
                          >
                            {addingCustomer ? 'Adding…' : 'Add'}
                          </button>
                        </form>

                        {customersLoading ? (
                          <p className="text-xs text-gray-400">Loading…</p>
                        ) : customers.length === 0 ? (
                          <p className="text-xs text-gray-500">
                            No customers yet. Add email or phone so they can use this code.
                          </p>
                        ) : (
                          <div className="bg-white border border-gray-200 overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                  <th className="text-left px-3 py-2 font-semibold text-xs tracking-wider">
                                    EMAIL
                                  </th>
                                  <th className="text-left px-3 py-2 font-semibold text-xs tracking-wider">
                                    PHONE
                                  </th>
                                  <th className="text-left px-3 py-2 font-semibold text-xs tracking-wider">
                                    STATUS
                                  </th>
                                  <th className="text-left px-3 py-2 font-semibold text-xs tracking-wider">
                                    ACTION
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {customers.map((c) => (
                                  <tr key={c.id} className="border-b border-gray-100">
                                    <td className="px-3 py-2 text-xs">{c.email || '—'}</td>
                                    <td className="px-3 py-2 text-xs">{c.phone || '—'}</td>
                                    <td className="px-3 py-2">
                                      {c.usedAt ? (
                                        <span className="text-xs text-gray-600">
                                          Used
                                          {c.usedOrderId ? ` · ${c.usedOrderId}` : ''}
                                        </span>
                                      ) : (
                                        <span className="text-xs font-medium text-green-700">
                                          Unused
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2">
                                      {!c.usedAt && (
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveCustomer(c.id)}
                                          disabled={removing === c.id}
                                          className="p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-50"
                                          title="Remove"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
