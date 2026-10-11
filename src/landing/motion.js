import { useEffect, useRef, useState } from 'react'

// Adds .is-visible to the element once it scrolls into view (once only).
export function useReveal({ threshold = 0.15, rootMargin = '0px 0px -8% 0px' } = {}) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('is-visible')
      return undefined
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-visible')
          observer.disconnect()
        }
      },
      { threshold, rootMargin },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold, rootMargin])
  return ref
}

// True once the page has scrolled past `offset` pixels.
export function useScrolled(offset = 8) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > offset)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [offset])
  return scrolled
}

// Id of the section currently in the middle of the screen.
export function useActiveSection(ids) {
  const [active, setActive] = useState(null)
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id)
      },
      { rootMargin: '-45% 0px -50% 0px' },
    )
    for (const id of ids) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(',')])
  return active
}

// Windows desktop/laptop? (The app is Windows-only; phones get a gentle hint.)
export function isWindowsDevice() {
  if (typeof navigator === 'undefined') return true
  const platform = navigator.userAgentData?.platform ?? navigator.platform ?? ''
  return /win/i.test(platform) || /Windows NT/i.test(navigator.userAgent)
}

// Advances an index every `interval` ms while not paused. Stops when the
// element is off screen or the tab is hidden, and when the visitor prefers
// reduced motion (they can still switch manually).
export function useAutoplay(count, { interval = 5000, paused = false } = {}) {
  const [index, setIndex] = useState(0)
  const [inView, setInView] = useState(true)
  const ref = useRef(null)
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return undefined
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.25 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const running = !paused && inView && !reduced && count > 1
  useEffect(() => {
    if (!running) return undefined
    const timer = setTimeout(() => {
      if (document.visibilityState === 'visible') setIndex((i) => (i + 1) % count)
    }, interval)
    return () => clearTimeout(timer)
  }, [running, index, count, interval])

  return { index, setIndex, running, ref }
}
