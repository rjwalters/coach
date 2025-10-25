import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import TodoList from '../components/TodoList'
import CoachPanel from '../components/CoachPanel'
import ThemeToggle from '../components/ThemeToggle'

export default function DashboardPage() {
  const { logout, userId } = useAuth()
  const [activeMode, setActiveMode] = useState<'tasks' | 'interview'>('tasks')

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <header className="border-b bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Coach</h1>
            {userId && (
              <p className="text-xs text-muted-foreground">User ID: {userId.substring(0, 8)}...</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant={activeMode === 'tasks' ? 'default' : 'outline'}
              onClick={() => setActiveMode('tasks')}
              size="sm"
            >
              Tasks
            </Button>
            <Button
              variant={activeMode === 'interview' ? 'default' : 'outline'}
              onClick={() => setActiveMode('interview')}
              size="sm"
            >
              Interview Mode
            </Button>
            <ThemeToggle />
            <Button variant="outline" onClick={logout} size="sm">
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {activeMode === 'tasks' ? (
              <Card>
                <CardHeader>
                  <CardTitle>Your Tasks</CardTitle>
                  <CardDescription>
                    Manage your todo list with AI-powered coaching
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TodoList />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Interview Mode</CardTitle>
                  <CardDescription>
                    Let your AI coach help you create and prioritize tasks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-muted-foreground">
                    Interview mode coming soon...
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="lg:col-span-1">
            <CoachPanel />
          </div>
        </div>
      </main>
    </div>
  )
}
