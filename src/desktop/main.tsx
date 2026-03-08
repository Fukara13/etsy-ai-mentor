/**
 * DC-2/DC-5: Desktop Control Center renderer entry.
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App.tsx'

const root = document.getElementById('root')
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}
