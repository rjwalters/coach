import React, { createContext, useContext, useState, useEffect } from 'react'
import { deriveKey, deriveUserId, encryptData, decryptData } from '../lib/crypto'

interface AuthContextType {
  isAuthenticated: boolean
  login: (passphrase: string) => Promise<boolean>
  register: (passphrase: string) => Promise<boolean>
  logout: () => void
  encryptionKey: CryptoKey | null
  userId: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    // Check if user is already authenticated
    const storedUserId = localStorage.getItem('coach_user_id')
    if (storedUserId) {
      setIsAuthenticated(true)
      setUserId(storedUserId)
    }
  }, [])

  const register = async (passphrase: string): Promise<boolean> => {
    try {
      // Derive user ID from passphrase
      const derivedUserId = await deriveUserId(passphrase)

      // Try to register user in D1
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: derivedUserId })
      })

      if (!response.ok) {
        if (response.status === 409) {
          console.error('User already exists')
          return false
        }
        throw new Error('Failed to register user')
      }

      // Now login with the same passphrase
      return await login(passphrase)
    } catch (error) {
      console.error('Registration failed:', error)
      return false
    }
  }

  const login = async (passphrase: string): Promise<boolean> => {
    try {
      // Derive user ID from passphrase
      const derivedUserId = await deriveUserId(passphrase)

      // Check if user exists in D1
      const response = await fetch(`/api/users?user_id=${derivedUserId}`)

      if (!response.ok) {
        if (response.status === 404) {
          console.error('User not found')
          return false
        }
        throw new Error('Failed to fetch user')
      }

      // Update last login time
      await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: derivedUserId })
      })

      // Derive encryption key from passphrase
      const key = await deriveKey(passphrase)

      // Test encryption/decryption
      const testData = 'test'
      const encrypted = await encryptData(testData, key)
      const decrypted = await decryptData(encrypted, key)

      if (decrypted !== testData) {
        return false
      }

      // Store user ID for session persistence
      localStorage.setItem('coach_user_id', derivedUserId)
      setUserId(derivedUserId)
      setEncryptionKey(key)
      setIsAuthenticated(true)
      return true
    } catch (error) {
      console.error('Login failed:', error)
      return false
    }
  }

  const logout = () => {
    localStorage.removeItem('coach_user_id')
    localStorage.removeItem('coach_salt')
    setEncryptionKey(null)
    setUserId(null)
    setIsAuthenticated(false)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, register, logout, encryptionKey, userId }}>
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
