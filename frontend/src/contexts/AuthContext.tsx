import React, { createContext, useContext, useState } from "react"

export interface User {
  id: string
  name: string
  email: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (token: string, user: User) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem("user")
    return raw ? JSON.parse(raw) : null
  })
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("token")
  })

  const login = (authToken: string, authUser: User) => {
    setToken(authToken)
    setUser(authUser)
    localStorage.setItem("token", authToken)
    localStorage.setItem("user", JSON.stringify(authUser))
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem("token")
    localStorage.removeItem("user")
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
