import React, { createContext, useContext, useState, useEffect } from 'react'
import type { PublicUser } from '../lib/schemas/auth'

interface AuthContextType {
  isAuthenticated: boolean
  user: PublicUser | null
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  encryptionKey: CryptoKey | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<PublicUser | null>(null)
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null)

  useEffect(() => {
    // Check if user is already authenticated via session token
    const checkSession = async () => {
      const sessionToken = localStorage.getItem('coach_session_token')

      if (sessionToken) {
        try {
          const response = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${sessionToken}`
            }
          })

          if (response.ok) {
            const data = await response.json()
            setUser(data.user)
            setIsAuthenticated(true)
            console.log('✓ Session restored for user:', data.user.email)
          } else {
            // Invalid/expired session, clear it
            localStorage.removeItem('coach_session_token')
          }
        } catch (error) {
          console.error('Session check failed:', error)
          localStorage.removeItem('coach_session_token')
        }
      }
    }

    checkSession()
  }, [])

  const register = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: data.details || data.error || 'Registration failed'
        }
      }

      console.log('✓ Registration successful:', data.user.email)

      // Now login with the same credentials
      return await login(email, password)
    } catch (error) {
      console.error('Registration failed:', error)
      return {
        success: false,
        error: 'An unexpected error occurred during registration'
      }
    }
  }

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: data.details || data.error || 'Login failed'
        }
      }

      // Store session token
      localStorage.setItem('coach_session_token', data.session_token)

      // Set user data
      setUser(data.user)
      setIsAuthenticated(true)

      console.log('✓ Login successful:', data.user.email)

      // TODO: Handle encryption key management (DEK/KEK) - Phase 3
      // For now, encryption key remains null until we implement two-tier encryption

      return { success: true }
    } catch (error) {
      console.error('Login failed:', error)
      return {
        success: false,
        error: 'An unexpected error occurred during login'
      }
    }
  }

  const logout = async () => {
    const sessionToken = localStorage.getItem('coach_session_token')

    if (sessionToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`
          }
        })
        console.log('✓ Logout successful')
      } catch (error) {
        console.error('Logout API call failed:', error)
      }
    }

    // Clear local state regardless of API call success
    localStorage.removeItem('coach_session_token')
    setUser(null)
    setEncryptionKey(null)
    setIsAuthenticated(false)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, register, logout, encryptionKey }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
