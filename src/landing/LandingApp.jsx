import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './Home'
import AppHandoff from './AppHandoff'

// The public website (landing build). It has no login, dashboards or
// Super Admin pages and never talks to the backend: all of that lives in the
// Windows desktop apps. /activate and /reset-password only hand the emailed
// link over to the installed Firm Management app.
export default function LandingApp() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/activate" element={<AppHandoff kind="activate" />} />
      <Route path="/reset-password" element={<AppHandoff kind="reset-password" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
