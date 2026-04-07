import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import useGameStore from './store/useGameStore'

if (import.meta.env.DEV) {
  window.__store = useGameStore
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
