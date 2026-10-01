import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App'
import { requestPersistence } from './lib/db'

registerSW({ immediate: true })
requestPersistence()
createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)
