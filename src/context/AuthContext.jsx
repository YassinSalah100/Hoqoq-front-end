import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { authApi, usersApi, setTokens, setUnauthorizedHandler, hasStoredSession, ApiError } from '../lib/api'

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
  useEffect(() => {
    if (!hasStoredSession()) {
      setRestoring(false)
      return
    }
    usersApi
      .me()
      .then((profile) => setCurrentUser(buildUser(profile)))
      .catch(() => clearSession())
      .finally(() => setRestoring(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function login(email, password, mfaCode) {
    const res = await authApi.login(email, password, mfaCode)
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

  const value = useMemo(() => ({ currentUser, restoring, login, logout, setCurrentUser }), [currentUser, restoring])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export { ApiError }
