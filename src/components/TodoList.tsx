import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { useAuth } from '../contexts/AuthContext'
import { encryptData, decryptData } from '../lib/crypto'

interface Todo {
  id: string
  text: string
  completed: boolean
  createdAt: number
}

interface EncryptedTodo {
  id: string
  user_id: string
  encrypted_data: string
  created_at: number
  updated_at: number
}

export default function TodoList() {
  const { encryptionKey } = useAuth()
  const [todos, setTodos] = useState<Todo[]>([])
  const [newTodoText, setNewTodoText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  // Encrypt a todo before sending to API
  const encryptTodo = async (todo: Todo): Promise<string> => {
    if (!encryptionKey) {
      throw new Error('Encryption key not available')
    }

    const todoData = JSON.stringify({
      text: todo.text,
      completed: todo.completed,
      createdAt: todo.createdAt,
    })

    return encryptData(todoData, encryptionKey)
  }

  // Decrypt a todo received from API
  const decryptTodo = async (encryptedTodo: EncryptedTodo): Promise<Todo> => {
    if (!encryptionKey) {
      throw new Error('Encryption key not available')
    }

    const decryptedData = await decryptData(encryptedTodo.encrypted_data, encryptionKey)
    const todoData = JSON.parse(decryptedData)

    return {
      id: encryptedTodo.id,
      text: todoData.text,
      completed: todoData.completed,
      createdAt: todoData.createdAt,
    }
  }

  // Fetch todos on mount
  useEffect(() => {
    if (!encryptionKey) return

    const fetchTodos = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const encryptedTodos = await apiCall('/api/todos') as EncryptedTodo[]

        // Decrypt all todos
        const decryptedTodos = await Promise.all(
          encryptedTodos.map(encryptedTodo => decryptTodo(encryptedTodo))
        )

        setTodos(decryptedTodos)
        console.log(`✓ Loaded ${decryptedTodos.length} todos`)
      } catch (err) {
        console.error('Failed to fetch todos:', err)
        setError('Failed to load todos. Please try refreshing the page.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchTodos()
  }, [encryptionKey])

  const addTodo = async () => {
    if (!newTodoText.trim() || !encryptionKey) return

    const newTodo: Todo = {
      id: '', // Will be assigned by server
      text: newTodoText,
      completed: false,
      createdAt: Date.now(),
    }

    setError(null)

    try {
      const encrypted_data = await encryptTodo(newTodo)

      const response = await apiCall('/api/todos', {
        method: 'POST',
        body: JSON.stringify({ encrypted_data }),
      }) as EncryptedTodo

      const decryptedTodo = await decryptTodo(response)

      setTodos([decryptedTodo, ...todos])
      setNewTodoText('')
      console.log('✓ Todo created:', decryptedTodo.text)
    } catch (err) {
      console.error('Failed to create todo:', err)
      setError('Failed to create todo. Please try again.')
    }
  }

  const toggleTodo = async (id: string) => {
    const todo = todos.find(t => t.id === id)
    if (!todo || !encryptionKey) return

    const updatedTodo = { ...todo, completed: !todo.completed }
    setError(null)

    // Optimistic update
    setTodos(todos.map(t => t.id === id ? updatedTodo : t))

    try {
      const encrypted_data = await encryptTodo(updatedTodo)

      await apiCall('/api/todos', {
        method: 'PUT',
        body: JSON.stringify({ id, encrypted_data }),
      })

      console.log('✓ Todo updated:', updatedTodo.text)
    } catch (err) {
      // Revert on error
      setTodos(todos.map(t => t.id === id ? todo : t))
      console.error('Failed to update todo:', err)
      setError('Failed to update todo. Please try again.')
    }
  }

  const deleteTodo = async (id: string) => {
    const todo = todos.find(t => t.id === id)
    if (!todo) return

    setError(null)

    // Optimistic update
    const previousTodos = todos
    setTodos(todos.filter(t => t.id !== id))

    try {
      await apiCall(`/api/todos?id=${id}`, {
        method: 'DELETE',
      })

      console.log('✓ Todo deleted:', todo.text)
    } catch (err) {
      // Revert on error
      setTodos(previousTodos)
      console.error('Failed to delete todo:', err)
      setError('Failed to delete todo. Please try again.')
    }
  }

  if (!encryptionKey) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Loading encryption key...</p>
        <p className="text-sm mt-2">If this persists, try logging out and back in.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          placeholder="Add a new task..."
          value={newTodoText}
          onChange={(e) => setNewTodoText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addTodo()}
          disabled={isLoading}
        />
        <Button onClick={addTodo} disabled={isLoading || !newTodoText.trim()}>
          Add
        </Button>
      </div>

      <div className="space-y-2">
        {isLoading && todos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading todos...
          </div>
        ) : todos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No tasks yet. Add your first task above!
          </div>
        ) : (
          todos.map((todo) => (
            <div
              key={todo.id}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => toggleTodo(todo.id)}
                className="h-5 w-5 rounded border-gray-300"
              />
              <span
                className={`flex-1 ${
                  todo.completed ? 'line-through text-muted-foreground' : ''
                }`}
              >
                {todo.text}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteTodo(todo.id)}
              >
                Delete
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
