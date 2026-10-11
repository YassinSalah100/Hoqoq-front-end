import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const TOKEN = /^[A-Za-z0-9_-]{20,256}$/

// Accepts a full emailed link (any host) or a bare token; '' if neither.
export function tokenFromPasted(value) {
  const text = (value ?? '').trim()
  if (!text) return ''
  const match = /[?&]token=([A-Za-z0-9_-]{20,256})(?:[&#]|$)/.exec(text)
  if (match) return match[1]
  return TOKEN.test(text) ? text : ''
}

// Reads ?token= once, keeps it in memory, and removes it from the address so
// it doesn't linger in history or get passed on to other pages.
export function useLinkToken() {
  const location = useLocation()
  const navigate = useNavigate()
  const [token] = useState(() => tokenFromPasted(new URLSearchParams(location.search).get('token') ?? ''))
  useEffect(() => {
    if (location.search) navigate(location.pathname, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return token
}
