import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'

window.addEventListener('error', (e) => {
  console.error('[renderer error]', e.error ?? e.message, e.filename, e.lineno, e.colno)
})
window.addEventListener('unhandledrejection', (e) => {
  console.error('[renderer promise]', e.reason)
})

// Strict Mode disabled so dashboard does not remount after Gate 7 "Liste tanındı" (avoids automatic transition back)
ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)
