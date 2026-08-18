import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api, auth, setUnauthorizedHandler } from '../api/client'
import type { LoginResponse, Role } from '../api/types'

interface AuthState {
  user: LoginResponse | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  /** Mirrors hasAnyRole(...) on the backend so the UI hides what would 403. */
  hasRole: (...roles: Role[]) => boolean
}

const Ctx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LoginResponse | null>(() => auth.user())

  useEffect(() => {
    // The client throws 401 from anywhere; clearing state here means one
    // expired token bounces the whole app to the login screen.
    setUnauthorizedHandler(() => setUser(null))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password)
    auth.save(res)
    setUser(res)
  }, [])

  const logout = useCallback(() => {
    auth.clear()
    setUser(null)
  }, [])

  const hasRole = useCallback(
    (...roles: Role[]) => (user ? roles.includes(user.role) : false),
    [user],
  )

  const value = useMemo(
    () => ({ user, login, logout, hasRole }),
    [user, login, logout, hasRole],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
