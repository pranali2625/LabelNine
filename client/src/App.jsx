import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'

// Pages
import Home from './pages/Home'
import Shop from './pages/Shop'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import OrderSuccess from './pages/OrderSuccess'
import OrderTracking from './pages/OrderTracking'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Account from './pages/Account'
import MyOrders from './pages/MyOrders'
import OrderDetail from './pages/OrderDetail'
import About from './pages/About'
import Policies from './pages/Policies'
import PrivacyPolicy from './pages/PrivacyPolicy'
import ReturnRefundPolicy from './pages/ReturnRefundPolicy'
import TermsOfService from './pages/TermsOfService'
import Contact from './pages/Contact'

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard'
import AdminProducts from './pages/admin/Products'
import AdminOrders from './pages/admin/Orders'
import AdminUsers from './pages/admin/Users'
import AdminCoupons from './pages/admin/Coupons'
import AdminLayout from './pages/admin/AdminLayout'

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="shop" element={<Shop />} />
            <Route path="shop/:id" element={<ProductDetail />} />
            <Route path="cart" element={<Cart />} />
            <Route path="about" element={<About />} />
            <Route path="help/policies" element={<Policies />} />
            <Route path="help/returns" element={<ReturnRefundPolicy />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
            <Route path="reset-password" element={<ResetPassword />} />
            <Route element={<ProtectedRoute />}>
              <Route path="checkout" element={<Checkout />} />
              <Route path="order-success/:orderId" element={<OrderSuccess />} />
              <Route path="account" element={<Account />} />
              <Route path="account/orders" element={<MyOrders />} />
              <Route path="account/orders/:orderId" element={<OrderDetail />} />
              <Route path="contact" element={<Contact />} />
              <Route path="track" element={<OrderTracking />} />
              <Route path="track/:orderId" element={<OrderTracking />} />
              <Route path="help/privacy" element={<PrivacyPolicy />} />
              <Route path="help/terms" element={<TermsOfService />} />
            </Route>
          </Route>
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="coupons" element={<AdminCoupons />} />
            </Route>
          </Route>
        </Routes>
      </CartProvider>
    </AuthProvider>
  )
}

export default App
