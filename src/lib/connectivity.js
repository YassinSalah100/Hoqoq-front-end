import { useSyncExternalStore } from 'react'

// Whether the backend is currently reachable. Hoqooq is internet-dependent
// (not offline-first): this store only lets the UI stay stable while the
// connection is down and recover by itself when it returns.
//
// "Offline" is decided by a health probe, not by a single failed request, so
// one slow or dropped call doesn't flip the whole app into offline mode.

const PROBE_INTERVAL_MS = 5000
const PROBE_TIMEOUT_MS = 5000

let online = typeof navigator === 'undefined' ? true : navigator.onLine !== false
let healthUrl = '/health'
let probeTimer = null
let probing = null
const listeners = new Set()
const reconnectListeners = new Set()

export function configureConnectivity({ healthUrl: url }) {
  healthUrl = url
}

function emit() {
  listeners.forEach((listener) => listener())
}

function setOnline(next) {
  if (next === online) return
  online = next
  emit()
  if (next) {
    stopProbeLoop()
    reconnectListeners.forEach((listener) => listener())
  } else {
    startProbeLoop()
  }
}

async function probe() {
  if (!probing) {
    probing = fetch(healthUrl, { cache: 'no-store', signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) })
      .then((res) => res.ok)
      .catch(() => false)
      .then((reachable) => {
        setOnline(reachable)
        return reachable
      })
      .finally(() => {
        probing = null
      })
  }
  return probing
}

function startProbeLoop() {
  if (probeTimer) return
  probeTimer = setInterval(probe, PROBE_INTERVAL_MS)
}

function stopProbeLoop() {
  clearInterval(probeTimer)
  probeTimer = null
}

// Called by the request wrapper when a call fails at the network level.
export function reportNetworkFailure() {
  probe()
}

// Called whenever the backend answered (any HTTP status means it's reachable).
export function reportNetworkSuccess() {
  setOnline(true)
}

export function isOnline() {
  return online
}

// Runs `listener` each time the connection comes back after being lost.
export function onReconnect(listener) {
  reconnectListeners.add(listener)
  return () => reconnectListeners.delete(listener)
}

if (typeof window !== 'undefined') {
  window.addEventListener('offline', () => setOnline(false))
  window.addEventListener('online', () => probe())
  if (!online) startProbeLoop()
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useConnectivity() {
  return useSyncExternalStore(subscribe, isOnline, isOnline)
}
