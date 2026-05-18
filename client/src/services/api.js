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

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ln_token')
      localStorage.removeItem('ln_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
