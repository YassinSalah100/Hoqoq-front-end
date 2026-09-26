import { useEffect, useState } from 'react'
import { fetchAuthedImageUrl } from '../../lib/api'

// Renders an image served behind a Bearer-token-protected endpoint (firm
// logos, etc.) — a plain <img src> can't carry the auth header these need.
// `hasSource` lets the caller skip the fetch entirely when it already knows
// there's nothing to load (e.g. no logo uploaded yet), instead of guessing
// from the response of a request that was never going to succeed.
export default function AuthedImage({ src, hasSource = true, alt = '', className, fallback = null }) {
  const [objectUrl, setObjectUrl] = useState(null)

  useEffect(() => {
    if (!hasSource || !src) {
      setObjectUrl(null)
      return
    }
    let cancelled = false
    fetchAuthedImageUrl(src).then((url) => {
      if (cancelled) return
      setObjectUrl(url)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, hasSource])

  // Revoke the previous blob URL once it's replaced/unmounted, so repeatedly
  // re-uploading a logo doesn't leak one blob per upload.
  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [objectUrl])

  if (!objectUrl) return fallback
  return <img src={objectUrl} alt={alt} className={className} />
}
