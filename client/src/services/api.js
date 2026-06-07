import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' }
})

// Attach token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ln_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Redirect to login only when an authenticated session expires — not on failed login attempts
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const url = err.config?.url || ''
      const message = err.response?.data?.message || ''
      const isAuthEndpoint = url.includes('/auth/')
      const isCredentialError = ['Invalid credentials', 'Current password is incorrect'].includes(message)
      const onAuthPage = ['/login', '/register'].includes(window.location.pathname)
      const hadToken = !!localStorage.getItem('ln_token')

      if (hadToken && !isAuthEndpoint && !isCredentialError && !onAuthPage) {
        localStorage.removeItem('ln_token')
        localStorage.removeItem('ln_user')
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default api
