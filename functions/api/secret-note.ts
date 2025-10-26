// Cloudflare Pages Function for managing encrypted secret note
// Each user has one secret note stored encrypted in their user record

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

// GET /api/secret-note - Fetch encrypted secret note for authenticated user
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

    const user = await DB.prepare(
      'SELECT encrypted_secret_note FROM users WHERE id = ?'
    ).bind(userId).first()

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        encrypted_secret_note: user.encrypted_secret_note || null
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error fetching secret note:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

// PUT /api/secret-note - Update encrypted secret note
export async function onRequestPut(context: { env: Env; request: Request }) {
  const { DB } = context.env

  try {
    const userId = await getUserIdFromSession(context.request, DB)

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: 'Invalid or expired session' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const body = await context.request.json() as {
      encrypted_secret_note: string | null
    }

    const { encrypted_secret_note } = body

    // Allow null to clear the note
    if (encrypted_secret_note !== null && typeof encrypted_secret_note !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Bad request', details: 'Invalid encrypted_secret_note' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const now = Date.now()

    await DB.prepare(
      'UPDATE users SET encrypted_secret_note = ?, updated_at = ? WHERE id = ?'
    ).bind(encrypted_secret_note, now, userId).run()

    return new Response(
      JSON.stringify({
        success: true,
        encrypted_secret_note
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error updating secret note:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
