import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { useAuth } from '../contexts/AuthContext'
import { encryptData, decryptData } from '../lib/crypto'

export default function SecretNote() {
  const { encryptionKey } = useAuth()
  const [noteText, setNoteText] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [joke, setJoke] = useState<string | null>(null)
  const [isGeneratingJoke, setIsGeneratingJoke] = useState(false)

  // Helper to get session token
  const getSessionToken = () => localStorage.getItem('coach_session_token')

  // Helper to make authenticated API calls
  const apiCall = async (url: string, options: RequestInit = {}) => {
    const sessionToken = getSessionToken()
    if (!sessionToken) {
      throw new Error('Not authenticated')
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.details || errorData.error || 'Request failed')
    }

    return response.json()
  }

  // Fetch and decrypt note on mount
  useEffect(() => {
    if (!encryptionKey) return

    const fetchNote = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const data = await apiCall('/api/secret-note')

        if (data.encrypted_secret_note) {
          // Decrypt the note
          const decryptedNote = await decryptData(data.encrypted_secret_note, encryptionKey)
          setNoteText(decryptedNote)
          console.log('✓ Secret note loaded and decrypted')
        } else {
          setNoteText('')
          console.log('✓ No secret note found (creating new)')
        }
      } catch (err) {
        console.error('Failed to fetch secret note:', err)
        setError('Failed to load secret note. Please try refreshing the page.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchNote()
  }, [encryptionKey])

  const saveNote = async () => {
    if (!encryptionKey) return

    setIsSaving(true)
    setError(null)

    try {
      // Encrypt the note (allow empty string)
      const encryptedNote = noteText.trim()
        ? await encryptData(noteText, encryptionKey)
        : null

      await apiCall('/api/secret-note', {
        method: 'PUT',
        body: JSON.stringify({ encrypted_secret_note: encryptedNote }),
      })

      setLastSaved(new Date())
      console.log('✓ Secret note saved and encrypted')
    } catch (err) {
      console.error('Failed to save secret note:', err)
      setError('Failed to save note. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const generateJoke = async () => {
    setIsGeneratingJoke(true)
    setError(null)
    setJoke(null)

    try {
      const data = await apiCall('/api/ai-joke', {
        method: 'POST',
      })

      setJoke(data.joke)
      console.log('✓ AI joke generated:', data.joke)
      console.log('  Model:', data.model)
    } catch (err) {
      console.error('Failed to generate joke:', err)
      setError('Failed to generate joke. Please try again.')
    } finally {
      setIsGeneratingJoke(false)
    }
  }

  if (!encryptionKey) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Loading encryption key...</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Loading your secret note...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Secret Note</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Your private, encrypted note. Only you can read this.
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Write your secret note here... It will be encrypted before being saved."
          className="w-full min-h-[200px] p-4 rounded-lg border bg-background resize-y font-mono text-sm"
          disabled={isSaving}
        />

        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {lastSaved && (
              <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={generateJoke}
              disabled={isGeneratingJoke}
              size="sm"
              variant="outline"
            >
              {isGeneratingJoke ? 'Generating...' : '😂 Get AI Joke'}
            </Button>
            <Button
              onClick={saveNote}
              disabled={isSaving}
              size="sm"
            >
              {isSaving ? 'Saving...' : 'Save Note'}
            </Button>
          </div>
        </div>

        {joke && (
          <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-2xl">😂</span>
              <div className="flex-1">
                <p className="text-sm font-medium mb-1">AI Joke</p>
                <p className="text-sm">{joke}</p>
              </div>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded">
          🔒 This note is encrypted with your password before being saved. Even the server cannot read it.
        </div>
      </div>
    </div>
  )
}
