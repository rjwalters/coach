// Cloudflare Pages Function for productivity statistics
// Returns completion stats for authenticated user

interface Env {
  DB: D1Database
}

interface ProductivityStats {
  totalCompleted: number
  completedToday: number
  completedThisWeek: number
  currentStreak: number
  completionRate: number
}

// Helper function to validate session and get user_id
async function getUserIdFromSession(request: Request, DB: D1Database): Promise<string | null> {
  const authHeader = request.headers.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const sessionToken = authHeader.substring(7)

  // Validate session token
  const session = await DB.prepare(
    'SELECT user_id, expires_at FROM session_tokens WHERE id = ?'
  ).bind(sessionToken).first()

  if (!session) {
    return null
  }

  // Check if session is expired
  if (session.expires_at < Date.now()) {
    return null
  }

  return session.user_id as string
}

// Helper: Get start of day timestamp
function getStartOfDay(timestamp: number): number {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

// Helper: Get start of week timestamp (Monday)
function getStartOfWeek(timestamp: number): number {
  const date = new Date(timestamp)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1) // Adjust to Monday
  date.setDate(diff)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

// Helper: Calculate current streak
async function calculateStreak(userId: string, DB: D1Database): Promise<number> {
  // Get all completed dates (as start of day timestamps)
  const { results } = await DB.prepare(
    `SELECT completed_at FROM todos
     WHERE user_id = ? AND completed_at IS NOT NULL
     ORDER BY completed_at DESC`
  ).bind(userId).all()

  if (!results || results.length === 0) {
    return 0
  }

  // Get unique days
  const completedDays = new Set<number>()
  for (const row of results) {
    const completedAt = row.completed_at as number
    completedDays.add(getStartOfDay(completedAt))
  }

  const sortedDays = Array.from(completedDays).sort((a, b) => b - a)

  const today = getStartOfDay(Date.now())
  const yesterday = today - 24 * 60 * 60 * 1000

  // Start counting from today or yesterday
  let streakStart = sortedDays[0] === today ? today : (sortedDays[0] === yesterday ? yesterday : null)

  if (streakStart === null) {
    return 0 // No recent completions
  }

  let streak = 1
  let currentDay = streakStart

  for (let i = 1; i < sortedDays.length; i++) {
    const expectedPreviousDay = currentDay - 24 * 60 * 60 * 1000

    if (sortedDays[i] === expectedPreviousDay) {
      streak++
      currentDay = sortedDays[i]
    } else {
      break // Streak broken
    }
  }

  return streak
}

// GET /api/stats - Get productivity statistics
export async function onRequestGet(context: { env: Env; request: Request }) {
  const { DB } = context.env

  try {
    const userId = await getUserIdFromSession(context.request, DB)

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: 'Invalid or expired session' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const now = Date.now()
    const startOfToday = getStartOfDay(now)
    const startOfWeek = getStartOfWeek(now)

    // Get total completed
    const totalResult = await DB.prepare(
      'SELECT COUNT(*) as count FROM todos WHERE user_id = ? AND completed_at IS NOT NULL'
    ).bind(userId).first()
    const totalCompleted = (totalResult?.count as number) || 0

    // Get completed today
    const todayResult = await DB.prepare(
      'SELECT COUNT(*) as count FROM todos WHERE user_id = ? AND completed_at >= ?'
    ).bind(userId, startOfToday).first()
    const completedToday = (todayResult?.count as number) || 0

    // Get completed this week
    const weekResult = await DB.prepare(
      'SELECT COUNT(*) as count FROM todos WHERE user_id = ? AND completed_at >= ?'
    ).bind(userId, startOfWeek).first()
    const completedThisWeek = (weekResult?.count as number) || 0

    // Get total todos created (for completion rate)
    const totalCreatedResult = await DB.prepare(
      'SELECT COUNT(*) as count FROM todos WHERE user_id = ?'
    ).bind(userId).first()
    const totalCreated = (totalCreatedResult?.count as number) || 0

    // Calculate completion rate
    const completionRate = totalCreated > 0 ? Math.round((totalCompleted / totalCreated) * 100) : 0

    // Calculate streak
    const currentStreak = await calculateStreak(userId, DB)

    const stats: ProductivityStats = {
      totalCompleted,
      completedToday,
      completedThisWeek,
      currentStreak,
      completionRate
    }

    console.log('✓ Stats calculated for user:', userId, stats)

    return new Response(
      JSON.stringify(stats),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error fetching stats:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
