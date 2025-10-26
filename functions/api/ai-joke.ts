// Cloudflare Pages Function for AI joke generation
// Uses Cloudflare Workers AI with LLaMA model

interface Env {
  DB: D1Database
  AI: Ai
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

// POST /api/ai-joke - Generate a joke using LLaMA model
export async function onRequestPost(context: { env: Env; request: Request }) {
  const { DB, AI } = context.env

  try {
    // Validate session
    const userId = await getUserIdFromSession(context.request, DB)

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: 'Invalid or expired session' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('Generating joke for user:', userId)

    // Call Cloudflare Workers AI with LLaMA model
    const modelName = '@cf/meta/llama-3.1-8b-instruct'
    const response = await AI.run(modelName, {
      messages: [
        {
          role: 'system',
          content: 'You are a friendly comedian. Tell short, funny, clean jokes. Keep your responses to just the joke, no extra commentary.'
        },
        {
          role: 'user',
          content: 'Tell me a funny joke!'
        }
      ],
      max_tokens: 200,
      temperature: 0.9, // Higher temperature for more creative/funny responses
    })

    console.log('AI response:', response)

    // Extract the joke from the response
    const joke = response?.response || 'Why did the AI cross the road? To get to the other dataset!'

    // Record AI usage
    if (response?.usage) {
      const usageId = crypto.randomUUID()
      const now = Date.now()

      await DB.prepare(
        `INSERT INTO ai_usage (id, user_id, model, prompt_tokens, completion_tokens, total_tokens, endpoint, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        usageId,
        userId,
        modelName,
        response.usage.prompt_tokens || 0,
        response.usage.completion_tokens || 0,
        response.usage.total_tokens || 0,
        '/api/ai-joke',
        now
      ).run()

      console.log('✓ AI usage recorded:', {
        prompt_tokens: response.usage.prompt_tokens,
        completion_tokens: response.usage.completion_tokens,
        total_tokens: response.usage.total_tokens
      })
    }

    return new Response(
      JSON.stringify({
        joke,
        model: modelName
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error generating joke:', error)

    // Return a fallback joke if AI fails
    return new Response(
      JSON.stringify({
        joke: 'Why do programmers prefer dark mode? Because light attracts bugs! 🐛',
        error: 'AI model temporarily unavailable, showing fallback joke',
        model: 'fallback'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
