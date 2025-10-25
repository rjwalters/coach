import React, { createContext, useContext, useState, useEffect } from 'react'
import { deriveKey, encryptData, decryptData } from '../lib/crypto'

interface AuthContextType {
  isAuthenticated: boolean
  login: (passphrase: string) => Promise<boolean>
  logout: () => void
  encryptionKey: CryptoKey | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null)

  useEffect(() => {
    // Check if user is already authenticated
    const storedKey = localStorage.getItem('coach_key_check')
    if (storedKey) {
      setIsAuthenticated(true)
    }
  }, [])

  const login = async (passphrase: string): Promise<boolean> => {
    try {
      // Derive encryption key from passphrase
      const key = await deriveKey(passphrase)

      // Test encryption/decryption
      const testData = 'test'
      const encrypted = await encryptData(testData, key)
      const decrypted = await decryptData(encrypted, key)

      if (decrypted !== testData) {
        return false
      }

      // Store a hash of the key for session persistence (not the actual key)
      const keyData = await crypto.subtle.exportKey('raw', key)
      const keyHash = await crypto.subtle.digest('SHA-256', keyData)
      const hashArray = Array.from(new Uint8Array(keyHash))
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

      localStorage.setItem('coach_key_check', hashHex)
      setEncryptionKey(key)
      setIsAuthenticated(true)
      return true
    } catch (error) {
      console.error('Login failed:', error)
      return false
    }
  }

  const logout = () => {
    localStorage.removeItem('coach_key_check')
    setEncryptionKey(null)
    setIsAuthenticated(false)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, encryptionKey }}>
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
