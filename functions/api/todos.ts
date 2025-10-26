// Cloudflare Pages Function for managing encrypted todos
// Todos are stored encrypted in D1, with session-based authentication

interface Env {
  DB: D1Database
}

interface Todo {
  id: string
  user_id: string
  encrypted_data: string
  completed_at: number | null
  created_at: number
  updated_at: number
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

// GET /api/todos - Fetch all todos for authenticated user
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

    const { results } = await DB.prepare(
      'SELECT * FROM todos WHERE user_id = ? ORDER BY created_at DESC'
    ).bind(userId).all()

    return new Response(
      JSON.stringify(results),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error fetching todos:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

// POST /api/todos - Create a new todo
export async function onRequestPost(context: { env: Env; request: Request }) {
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
      encrypted_data: string
    }

    const { encrypted_data } = body

    if (!encrypted_data) {
      return new Response(
        JSON.stringify({ error: 'Bad request', details: 'Missing encrypted_data' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const id = crypto.randomUUID()
    const now = Date.now()

    await DB.prepare(
      'INSERT INTO todos (id, user_id, encrypted_data, completed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(id, userId, encrypted_data, null, now, now).run()

    const newTodo = {
      id,
      user_id: userId,
      encrypted_data,
      completed_at: null,
      created_at: now,
      updated_at: now
    }

    return new Response(
      JSON.stringify(newTodo),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error creating todo:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

// PUT /api/todos - Update an existing todo
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
      id: string
      encrypted_data: string
      completed_at?: number | null
    }

    const { id, encrypted_data, completed_at } = body

    if (!id || !encrypted_data) {
      return new Response(
        JSON.stringify({ error: 'Bad request', details: 'Missing id or encrypted_data' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const now = Date.now()

    // Update only if user owns this todo
    const result = await DB.prepare(
      'UPDATE todos SET encrypted_data = ?, completed_at = ?, updated_at = ? WHERE id = ? AND user_id = ?'
    ).bind(encrypted_data, completed_at ?? null, now, id, userId).run()

    if (!result.success || result.meta.changes === 0) {
      return new Response(
        JSON.stringify({ error: 'Not found', details: 'Todo not found or unauthorized' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const updatedTodo = {
      id,
      user_id: userId,
      encrypted_data,
      completed_at: completed_at ?? null,
      updated_at: now
    }

    return new Response(
      JSON.stringify(updatedTodo),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error updating todo:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

// DELETE /api/todos/:id - Delete a todo
export async function onRequestDelete(context: { env: Env; request: Request }) {
  const { DB } = context.env

  try {
    const userId = await getUserIdFromSession(context.request, DB)

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: 'Invalid or expired session' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const url = new URL(context.request.url)
    const id = url.searchParams.get('id')

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Bad request', details: 'Missing todo id' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Delete only if user owns this todo
    const result = await DB.prepare(
      'DELETE FROM todos WHERE id = ? AND user_id = ?'
    ).bind(id, userId).run()

    if (!result.success || result.meta.changes === 0) {
      return new Response(
        JSON.stringify({ error: 'Not found', details: 'Todo not found or unauthorized' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, id }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error deleting todo:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
