import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import App from './App'
import './index.css'

// Initialize Convex client
const convexUrl = import.meta.env.VITE_CONVEX_URL || 'http://localhost:8000'
console.log('🔌 Connecting to Convex:', convexUrl)

const convex = new ConvexReactClient(convexUrl)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConvexProvider client={convex}>
      <App />
    </ConvexProvider>
  </React.StrictMode>,
)
