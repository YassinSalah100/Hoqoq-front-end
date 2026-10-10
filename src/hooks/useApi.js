import { useCallback, useEffect, useRef, useState } from 'react'
import { isNetworkError } from '../lib/api'
import { onReconnect } from '../lib/connectivity'

export function useFetch(fn, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // Whether `data` currently holds something worth keeping on screen.
  const hasData = useRef(false)

  const run = useCallback((silent) => {
    let cancelled = false
    if (!silent) {
      setLoading(true)
      setError(null)
    }
    fn()
      .then((res) => {
        if (cancelled) return
        hasData.current = true
        setData(res)
        setError(null)
      })
      .catch((err) => {
        if (cancelled) return
        // Lost connection while data is already shown: keep showing it rather
        // than replacing the page with an error. It refreshes on reconnect.
        if (isNetworkError(err) && hasData.current) return
        setError(err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, deps)

  const reload = useCallback(() => run(false), [run])

  useEffect(() => {
    hasData.current = false
    return run(false)
  }, [run])

  // Reads only — safe to repeat. Refresh quietly so the page doesn't flash.
  useEffect(() => onReconnect(() => run(true)), [run])

  return { data, loading, error, reload }
}
