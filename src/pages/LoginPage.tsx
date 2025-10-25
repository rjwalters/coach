import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import ThemeToggle from '../components/ThemeToggle'

export default function LoginPage() {
  const [passphrase, setPassphrase] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isNewUser, setIsNewUser] = useState(false)
  const { login, register, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  if (isAuthenticated) {
    navigate('/dashboard')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      let success: boolean
      if (isNewUser) {
        success = await register(passphrase)
        if (!success) {
          setError('Failed to create account. Please try again.')
        }
      } else {
        success = await login(passphrase)
        if (!success) {
          setError('Invalid passphrase or user not found')
        }
      }

      if (success) {
        navigate('/dashboard')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold text-center">Welcome to Coach</CardTitle>
          <CardDescription className="text-center">
            Your AI-powered personal coach and task manager
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="passphrase" className="text-sm font-medium">
                Passphrase
              </label>
              <Input
                id="passphrase"
                type="password"
                placeholder="Enter your passphrase"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                required
                disabled={isLoading}
                minLength={8}
              />
              <p className="text-xs text-muted-foreground">
                {isNewUser
                  ? 'Choose a strong passphrase (min 8 characters). This will encrypt your data.'
                  : 'Enter your passphrase to access your account'
                }
              </p>
            </div>
            {error && (
              <div className="text-sm text-destructive">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (isNewUser ? 'Creating Account...' : 'Logging in...') : (isNewUser ? 'Create Account' : 'Login')}
            </Button>
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsNewUser(!isNewUser)
                  setError('')
                }}
                className="text-sm text-muted-foreground hover:text-foreground underline"
              >
                {isNewUser ? 'Already have an account? Login' : 'New user? Create an account'}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
