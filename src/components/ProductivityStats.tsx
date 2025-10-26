import { useState, useEffect } from 'react'
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi'

interface Stats {
  totalCompleted: number
  completedToday: number
  completedThisWeek: number
  currentStreak: number
  completionRate: number
}

export default function ProductivityStats() {
  const { apiCall } = useAuthenticatedApi()
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch stats on mount
  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const data = await apiCall<Stats>('/api/stats')
        setStats(data)
        console.log('✓ Productivity stats loaded:', data)
      } catch (err) {
        console.error('Failed to fetch stats:', err)
        setError('Failed to load stats')
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (isLoading) {
    return (
      <div className="bg-card border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Your Progress</h3>
        <div className="text-sm text-muted-foreground">Loading stats...</div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="bg-card border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Your Progress</h3>
        <div className="text-sm text-destructive">{error || 'No stats available'}</div>
      </div>
    )
  }

  return (
    <div className="bg-card border rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Your Progress</h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Completed */}
        <div className="text-center p-4 bg-muted/30 rounded-lg">
          <div className="text-2xl font-bold text-primary">{stats.totalCompleted}</div>
          <div className="text-xs text-muted-foreground mt-1">Total Completed</div>
        </div>

        {/* Completed Today */}
        <div className="text-center p-4 bg-muted/30 rounded-lg">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.completedToday}</div>
          <div className="text-xs text-muted-foreground mt-1">Completed Today</div>
        </div>

        {/* Current Streak */}
        <div className="text-center p-4 bg-muted/30 rounded-lg">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.currentStreak}</div>
          <div className="text-xs text-muted-foreground mt-1">Day Streak</div>
        </div>

        {/* Completion Rate */}
        <div className="text-center p-4 bg-muted/30 rounded-lg">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.completionRate}%</div>
          <div className="text-xs text-muted-foreground mt-1">Completion Rate</div>
        </div>
      </div>

      {/* This week stat */}
      <div className="mt-4 text-sm text-muted-foreground text-center">
        {stats.completedThisWeek} task{stats.completedThisWeek !== 1 ? 's' : ''} completed this week
      </div>

      {/* Motivational message */}
      {stats.currentStreak >= 3 && (
        <div className="mt-4 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded text-sm text-green-800 dark:text-green-200 text-center">
          {stats.currentStreak >= 7
            ? `Amazing! ${stats.currentStreak} day streak! Keep it up!`
            : `Great momentum! ${stats.currentStreak} days in a row!`}
        </div>
      )}

      {stats.completedToday === 0 && stats.currentStreak > 0 && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded text-sm text-blue-800 dark:text-blue-200 text-center">
          Complete a task today to maintain your {stats.currentStreak} day streak!
        </div>
      )}
    </div>
  )
}
