import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
// Fonts are bundled (not loaded from Google) so the app looks the same offline
// and the desktop build needs no outside network for its UI.
import '@fontsource/amiri/400.css'
import '@fontsource/amiri/700.css'
import '@fontsource/ibm-plex-sans-arabic/300.css'
import '@fontsource/ibm-plex-sans-arabic/400.css'
import '@fontsource/ibm-plex-sans-arabic/500.css'
import '@fontsource/ibm-plex-sans-arabic/600.css'
import '@fontsource/ibm-plex-sans-arabic/700.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@fontsource/ibm-plex-mono/600.css'
import './index.css'

// VITE_SITE=landing builds the public website only (see .env.landing). The
// choice is made at build time, so the landing bundle contains none of the
// app (login, dashboards, Super Admin) and the app bundle none of the landing.
const { default: Root } =
  import.meta.env.VITE_SITE === 'landing' ? await import('./landing/LandingApp.jsx') : await import('./App.jsx')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Root />
    </BrowserRouter>
  </StrictMode>,
)
