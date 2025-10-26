// Cloudflare Pages Function for viewing AI usage statistics
// Returns per-user AI usage stats with token counts by model

interface Env {
  DB: D1Database
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

// GET /api/ai-usage - Get AI usage statistics for authenticated user
export async function onRequestGet(context: { env: Env; request: Request }) {
  const { DB } = context.env

  try {
    // Validate session
    const userId = await getUserIdFromSession(context.request, DB)

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: 'Invalid or expired session' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('Fetching AI usage stats for user:', userId)

    // Get overall stats
    const overallStats = await DB.prepare(
      `SELECT
        COUNT(*) as total_requests,
        SUM(prompt_tokens) as total_prompt_tokens,
        SUM(completion_tokens) as total_completion_tokens,
        SUM(total_tokens) as total_tokens
      FROM ai_usage
      WHERE user_id = ?`
    ).bind(userId).first()

    // Get stats by model
    const modelStats = await DB.prepare(
      `SELECT
        model,
        COUNT(*) as requests,
        SUM(prompt_tokens) as prompt_tokens,
        SUM(completion_tokens) as completion_tokens,
        SUM(total_tokens) as total_tokens
      FROM ai_usage
      WHERE user_id = ?
      GROUP BY model
      ORDER BY total_tokens DESC`
    ).bind(userId).all()

    // Get stats by endpoint
    const endpointStats = await DB.prepare(
      `SELECT
        endpoint,
        COUNT(*) as requests,
        SUM(prompt_tokens) as prompt_tokens,
        SUM(completion_tokens) as completion_tokens,
        SUM(total_tokens) as total_tokens
      FROM ai_usage
      WHERE user_id = ?
      GROUP BY endpoint
      ORDER BY total_tokens DESC`
    ).bind(userId).all()

    // Get recent usage (last 10 requests)
    const recentUsage = await DB.prepare(
      `SELECT
        id,
        model,
        prompt_tokens,
        completion_tokens,
        total_tokens,
        endpoint,
        created_at
      FROM ai_usage
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 10`
    ).bind(userId).all()

    const stats = {
      total_requests: overallStats?.total_requests || 0,
      total_prompt_tokens: overallStats?.total_prompt_tokens || 0,
      total_completion_tokens: overallStats?.total_completion_tokens || 0,
      total_tokens: overallStats?.total_tokens || 0,
      by_model: modelStats.results || [],
      by_endpoint: endpointStats.results || [],
      recent_usage: recentUsage.results || [],
    }

    return new Response(
      JSON.stringify(stats),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error fetching AI usage stats:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
