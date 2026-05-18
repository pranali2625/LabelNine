import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-center"
        toastOptions={{
          style: { fontFamily: 'inherit', fontSize: '14px' },
          success: { duration: 3000 },
          error: { duration: 4000 }
        }}
      />
    </BrowserRouter>
  </StrictMode>,
)
