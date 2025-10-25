// Cloudflare Pages Function for user management

interface Env {
  DB: D1Database
}

// Register a new user
export async function onRequestPost(context: { env: Env; request: Request }) {
  const { DB } = context.env

  try {
    const body = await context.request.json() as {
      user_id: string
    }

    const { user_id } = body

    if (!user_id) {
      return new Response('Missing user_id', { status: 400 })
    }

    // Check if user already exists
    const existing = await DB.prepare(
      'SELECT id FROM users WHERE id = ?'
    ).bind(user_id).first()

    if (existing) {
      return new Response('User already exists', { status: 409 })
    }

    const now = Date.now()

    await DB.prepare(
      'INSERT INTO users (id, created_at, last_login) VALUES (?, ?, ?)'
    ).bind(user_id, now, now).run()

    return Response.json({
      id: user_id,
      created_at: now,
      last_login: now
    })
  } catch (error) {
    console.error('Error creating user:', error)
    return new Response('Internal server error', { status: 500 })
  }
}

// Get or update user login
export async function onRequestGet(context: { env: Env; request: Request }) {
  const { DB } = context.env
  const url = new URL(context.request.url)
  const userId = url.searchParams.get('user_id')

  if (!userId) {
    return new Response('Missing user_id', { status: 400 })
  }

  try {
    const user = await DB.prepare(
      'SELECT * FROM users WHERE id = ?'
    ).bind(userId).first()

    if (!user) {
      return new Response('User not found', { status: 404 })
    }

    return Response.json(user)
  } catch (error) {
    console.error('Error fetching user:', error)
    return new Response('Internal server error', { status: 500 })
  }
}

// Update last login time
export async function onRequestPut(context: { env: Env; request: Request }) {
  const { DB } = context.env

  try {
    const body = await context.request.json() as {
      user_id: string
    }

    const { user_id } = body

    if (!user_id) {
      return new Response('Missing user_id', { status: 400 })
    }

    const now = Date.now()

    await DB.prepare(
      'UPDATE users SET last_login = ? WHERE id = ?'
    ).bind(now, user_id).run()

    return Response.json({ id: user_id, last_login: now })
  } catch (error) {
    console.error('Error updating user:', error)
    return new Response('Internal server error', { status: 500 })
  }
}
