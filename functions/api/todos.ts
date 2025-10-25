// Cloudflare Pages Function for managing todos
// This will handle encrypted todo data storage in D1

interface Env {
  DB: D1Database
}

interface Todo {
  id: string
  user_id: string
  encrypted_data: string
  created_at: number
  updated_at: number
}

export async function onRequestGet(context: { env: Env; request: Request }) {
  const { DB } = context.env
  const url = new URL(context.request.url)
  const userId = url.searchParams.get('user_id')

  if (!userId) {
    return new Response('Missing user_id', { status: 400 })
  }

  try {
    const { results } = await DB.prepare(
      'SELECT * FROM todos WHERE user_id = ? ORDER BY created_at DESC'
    ).bind(userId).all()

    return Response.json(results)
  } catch (error) {
    console.error('Error fetching todos:', error)
    return new Response('Internal server error', { status: 500 })
  }
}

export async function onRequestPost(context: { env: Env; request: Request }) {
  const { DB } = context.env

  try {
    const body = await context.request.json() as {
      user_id: string
      encrypted_data: string
    }

    const { user_id, encrypted_data } = body

    if (!user_id || !encrypted_data) {
      return new Response('Missing required fields', { status: 400 })
    }

    const id = crypto.randomUUID()
    const now = Date.now()

    await DB.prepare(
      'INSERT INTO todos (id, user_id, encrypted_data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, user_id, encrypted_data, now, now).run()

    return Response.json({ id, user_id, encrypted_data, created_at: now, updated_at: now })
  } catch (error) {
    console.error('Error creating todo:', error)
    return new Response('Internal server error', { status: 500 })
  }
}

export async function onRequestPut(context: { env: Env; request: Request }) {
  const { DB } = context.env

  try {
    const body = await context.request.json() as {
      id: string
      user_id: string
      encrypted_data: string
    }

    const { id, user_id, encrypted_data } = body

    if (!id || !user_id || !encrypted_data) {
      return new Response('Missing required fields', { status: 400 })
    }

    const now = Date.now()

    await DB.prepare(
      'UPDATE todos SET encrypted_data = ?, updated_at = ? WHERE id = ? AND user_id = ?'
    ).bind(encrypted_data, now, id, user_id).run()

    return Response.json({ id, user_id, encrypted_data, updated_at: now })
  } catch (error) {
    console.error('Error updating todo:', error)
    return new Response('Internal server error', { status: 500 })
  }
}

export async function onRequestDelete(context: { env: Env; request: Request }) {
  const { DB } = context.env
  const url = new URL(context.request.url)
  const id = url.searchParams.get('id')
  const userId = url.searchParams.get('user_id')

  if (!id || !userId) {
    return new Response('Missing id or user_id', { status: 400 })
  }

  try {
    await DB.prepare(
      'DELETE FROM todos WHERE id = ? AND user_id = ?'
    ).bind(id, userId).run()

    return Response.json({ success: true })
  } catch (error) {
    console.error('Error deleting todo:', error)
    return new Response('Internal server error', { status: 500 })
  }
}
