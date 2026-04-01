import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
/*NEED TO ADD THIS LINE SO WE HAVE A ROUTER -MSORIANO*/
import { BrowserRouter } from 'react-router-dom'
import './styles/Index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

