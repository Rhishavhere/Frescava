import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Declare the global window.frame API injected by preload
declare global {
  interface Window {
    frame: import('@shared/types').FrescavaAPI
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
