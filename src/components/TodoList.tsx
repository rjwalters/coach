import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { useAuth } from '../contexts/AuthContext'
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi'
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
  completed_at: number | null
  created_at: number
  updated_at: number
}

export default function TodoList() {
  const { encryptionKey } = useAuth()
  const { apiCall } = useAuthenticatedApi()
  const [todos, setTodos] = useState<Todo[]>([])
  const [newTodoText, setNewTodoText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // AI conversation state
  const [aiConversation, setAiConversation] = useState<Array<{role: string, content: string}>>([])
  const [isAiThinking, setIsAiThinking] = useState(false)
  const [aiQuestion, setAiQuestion] = useState<string | null>(null)

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

  // Get AI assistance for todo creation
  const getAiAssistance = async (userInput: string) => {
    setIsAiThinking(true)
    setError(null)

    try {
      const response = await apiCall<{type: 'question' | 'todo', content: string}>('/api/ai-todo-assist', {
        method: 'POST',
        body: JSON.stringify({
          userInput,
          existingTodos: todos.map(t => t.text),
          conversationHistory: aiConversation
        })
      })

      // Update conversation history
      const newHistory = [
        ...aiConversation,
        { role: 'user', content: userInput },
        { role: 'assistant', content: response.content }
      ]
      setAiConversation(newHistory)

      if (response.type === 'question') {
        // AI has a clarifying question
        setAiQuestion(response.content)
        console.log('AI asked a clarifying question:', response.content)
      } else {
        // AI provided a clear todo - create it
        console.log('AI provided todo:', response.content)
        await createTodoFromAi(response.content)
        // Reset conversation
        resetAiConversation()
      }
    } catch (err) {
      console.error('Failed to get AI assistance:', err)
      setError('AI assistant temporarily unavailable. Creating todo as-is.')
      // Fallback: create todo directly
      await createTodoDirectly(userInput)
    } finally {
      setIsAiThinking(false)
    }
  }

  // Create todo from AI suggestion
  const createTodoFromAi = async (todoText: string) => {
    if (!encryptionKey) return

    const newTodo: Todo = {
      id: '',
      text: todoText,
      completed: false,
      createdAt: Date.now(),
    }

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

  // Create todo directly (fallback when AI unavailable)
  const createTodoDirectly = async (todoText: string) => {
    if (!encryptionKey) return

    const newTodo: Todo = {
      id: '',
      text: todoText,
      completed: false,
      createdAt: Date.now(),
    }

    try {
      const encrypted_data = await encryptTodo(newTodo)

      const response = await apiCall('/api/todos', {
        method: 'POST',
        body: JSON.stringify({ encrypted_data }),
      }) as EncryptedTodo

      const decryptedTodo = await decryptTodo(response)

      setTodos([decryptedTodo, ...todos])
      setNewTodoText('')
      console.log('✓ Todo created (direct):', decryptedTodo.text)
    } catch (err) {
      console.error('Failed to create todo:', err)
      setError('Failed to create todo. Please try again.')
    }
  }

  // Reset AI conversation
  const resetAiConversation = () => {
    setAiConversation([])
    setAiQuestion(null)
    setNewTodoText('')
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

  // Handle add todo - uses AI assistance
  const handleAddTodo = async () => {
    if (!newTodoText.trim() || !encryptionKey) return
    await getAiAssistance(newTodoText)
  }

  const toggleTodo = async (id: string) => {
    const todo = todos.find(t => t.id === id)
    if (!todo || !encryptionKey) return

    const updatedTodo = { ...todo, completed: !todo.completed }
    const completed_at = updatedTodo.completed ? Date.now() : null
    setError(null)

    // Optimistic update
    setTodos(todos.map(t => t.id === id ? updatedTodo : t))

    try {
      const encrypted_data = await encryptTodo(updatedTodo)

      await apiCall('/api/todos', {
        method: 'PUT',
        body: JSON.stringify({ id, encrypted_data, completed_at }),
      })

      console.log('✓ Todo updated:', updatedTodo.text, completed_at ? `(completed at ${new Date(completed_at).toLocaleString()})` : '(uncompleted)')
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

      {/* AI Conversation UI */}
      {aiQuestion && (
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3">
          <div className="flex items-start gap-2">
            <span className="text-lg">🤖</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                AI Assistant
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {aiQuestion}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Your answer..."
              value={newTodoText}
              onChange={(e) => setNewTodoText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddTodo()}
              disabled={isAiThinking}
              className="bg-white dark:bg-gray-900"
            />
            <Button
              onClick={handleAddTodo}
              disabled={isAiThinking || !newTodoText.trim()}
              size="sm"
            >
              {isAiThinking ? 'Thinking...' : 'Answer'}
            </Button>
            <Button
              onClick={resetAiConversation}
              disabled={isAiThinking}
              variant="outline"
              size="sm"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Todo Input */}
      {!aiQuestion && (
        <div className="flex gap-2">
          <Input
            placeholder="Add a new task..."
            value={newTodoText}
            onChange={(e) => setNewTodoText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddTodo()}
            disabled={isLoading || isAiThinking}
          />
          <Button
            onClick={handleAddTodo}
            disabled={isLoading || isAiThinking || !newTodoText.trim()}
          >
            {isAiThinking ? 'Thinking...' : 'Add'}
          </Button>
        </div>
      )}

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
