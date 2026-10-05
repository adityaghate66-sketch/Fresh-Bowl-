// Entry point: connects React, the router (screen switching) and the
// global app state, then renders the app inside #root from index.html.

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { AppProvider } from './context/AppContext'
import './styles.css'

// HashRouter keeps the current screen in the URL after a "#" (e.g. #/home).
// This makes the app work from ANY host — a dev server, a static file, or
// the preview panel — without extra server configuration.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <AppProvider>
        <App />
      </AppProvider>
    </HashRouter>
  </StrictMode>
)
