import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authApi, usersApi, setTokens, setUnauthorizedHandler, hasStoredSession, ApiError } from '../lib/api'
import { onReconnect } from '../lib/connectivity'
import { accountRefusal } from '../lib/appVariant'

// Only these mean the stored session is really over; anything else (offline,
// timeout, server error) keeps the tokens so the user isn't logged out.
const SESSION_ENDED_STATUSES = new Set([401, 402, 403])

const AuthContext = createContext(null)

function buildName(profile, fallbackEmail) {
  return profile?.fullName || fallbackEmail
}

// Builds the frontend user object from a /users/me profile, falling back to
// whatever the login response itself carried for the fields the profile
// fetch might be missing. There is no Roles module on this backend —
// UserResponseDto exposes `accountType` (SUPER_ADMIN|FIRM_ADMIN|EMPLOYEE)
// and `isSuperAdmin` directly instead of a roles array. The login response's
// `user.roles` is just `[accountType]` (see identity.service.ts
// generateAuthResponse), kept here only as a fallback source for accountType
// if the /users/me call right after login happens to fail.
function buildUser(profile, fallback) {
  const permissions = profile?.permissions?.length ? profile.permissions : (fallback?.permissions ?? [])
  const accountType = profile?.accountType ?? fallback?.roles?.[0] ?? null
  const isSuperAdmin = profile?.isSuperAdmin ?? accountType === 'SUPER_ADMIN'
  return {
    id: profile?.id ?? fallback?.id,
    email: profile?.email ?? fallback?.email,
    name: buildName(profile, profile?.email ?? fallback?.email),
    accountType,
    isSuperAdmin,
    jobClassification: profile?.jobClassification ?? null,
    permissions,
    tenant: profile?.tenant ?? null,
  }
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  // Starts true whenever a token pair is already in storage, so routing waits
  // for the rehydration check below instead of flashing the login page.
  const [restoring, setRestoring] = useState(hasStoredSession())
  // Set when the stored session couldn't be checked (e.g. offline at startup).
  const [restoreError, setRestoreError] = useState(null)

  async function applySession({ accessToken, refreshToken, email, fallback }) {
    setTokens({ accessToken, refreshToken })

    // The login response only carries {id, email, roles, permissions}; fetch the
    // full profile right after so the UI has the real name, firm and merged
    // permissions (role + this account's specific grants) to show.
    let profile = null
    try {
      profile = await usersApi.me()
    } catch {
      // fall back to the minimal session info if /users/me isn't reachable
    }

    const user = buildUser(profile, { ...fallback, email })
    const refusal = accountRefusal(user)
    if (refusal) {
      try {
        await authApi.logout()
      } catch {
        // best effort; the local session is cleared regardless
      }
      setTokens(null)
      throw new Error(refusal)
    }
    setCurrentUser(user)
    return user
  }

  function clearSession() {
    setTokens(null)
    setCurrentUser(null)
  }

  setUnauthorizedHandler(() => clearSession())

  // On first mount, if a token pair survived from a previous session (page
  // refresh, browser reopened), restore it instead of forcing a fresh login.
  const restoreSession = useCallback(() => {
    setRestoreError(null)
    setRestoring(true)
    usersApi
      .me()
      .then((profile) => {
        const user = buildUser(profile)
        if (accountRefusal(user)) clearSession()
        else setCurrentUser(user)
      })
      .catch((err) => {
        if (err instanceof ApiError && SESSION_ENDED_STATUSES.has(err.status)) clearSession()
        else setRestoreError(err)
      })
      .finally(() => setRestoring(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!hasStoredSession()) {
      setRestoring(false)
      return
    }
    restoreSession()
  }, [restoreSession])

  // Offline at startup: try again by itself as soon as the connection returns.
  useEffect(() => (restoreError ? onReconnect(restoreSession) : undefined), [restoreError, restoreSession])

  async function login(email, password) {
    const res = await authApi.login(email, password)
    const user = await applySession({
      accessToken: res.accessToken ?? res.access_token,
      refreshToken: res.refreshToken ?? res.refresh_token,
      email,
      // Login's `user.roles` is just `[accountType]`; kept as a fallback so
      // access resolution still works if the /users/me profile fetch fails.
      fallback: { id: res.user?.id, roles: res.user?.roles ?? [], permissions: res.user?.permissions ?? [] },
    })
    return { user }
  }

  async function logout() {
    try {
      await authApi.logout()
    } catch {
      // ignore network errors on logout, clear locally regardless
    }
    clearSession()
  }

  const value = useMemo(
    () => ({ currentUser, restoring, restoreError, retryRestore: restoreSession, login, logout, setCurrentUser }),
    [currentUser, restoring, restoreError, restoreSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export { ApiError }
