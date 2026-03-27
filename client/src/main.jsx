import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/design-system.css'
import App from './App.jsx'

// Apply saved theme on first render
const savedTheme = localStorage.getItem('eq-theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
