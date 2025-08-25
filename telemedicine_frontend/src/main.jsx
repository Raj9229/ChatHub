import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import SimpleChatApp from './SimpleChatApp.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SimpleChatApp />
  </StrictMode>,
)
