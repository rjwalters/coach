// Cloudflare Pages Function for AI-assisted todo creation
// Helps users create clear, actionable todos with interview-style clarification

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

// POST /api/ai-todo-assist - Get AI assistance for todo creation
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

    // Parse request body
    const body = await context.request.json() as {
      userInput: string
      existingTodos: string[]
      conversationHistory?: Array<{ role: string; content: string }>
    }

    const { userInput, existingTodos, conversationHistory = [] } = body

    if (!userInput || typeof userInput !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Bad request', details: 'userInput is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('AI Todo Assist for user:', userId)
    console.log('User input:', userInput)
    console.log('Existing todos count:', existingTodos.length)

    // Build system prompt
    const systemPrompt = `You are a helpful personal assistant helping someone create a todo list. Your job is to:

1. Help create clear, actionable todo items from user input
2. Check if similar todos already exist in their list
3. Ask clarifying questions if the input is vague or unclear
4. Keep todos simple as free-form text (no dates, no priorities, no structure)
5. Be concise and friendly

IMPORTANT: You can respond in two ways:
- QUESTION: Ask a clarifying question if the input is vague
- TODO: Provide a clear, actionable todo item

Existing todos:
${existingTodos.length > 0 ? existingTodos.map((t, i) => `${i + 1}. ${t}`).join('\n') : '(No existing todos)'}

Rules:
- If a similar todo exists, point it out and ask if they want to add a new one or modify the existing one
- If the input is vague (like "work on project"), ask what specifically they want to do
- If the input is already clear and actionable, just confirm it as a todo
- Keep responses short and conversational
- Use the format "QUESTION: ..." or "TODO: ..." to start your response`

    // Build messages array
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: userInput }
    ]

    // Call AI
    const modelName = '@cf/meta/llama-3.1-8b-instruct'
    const response = await AI.run(modelName, {
      messages,
      max_tokens: 300,
      temperature: 0.7, // Balanced for helpfulness
    })

    console.log('AI response:', response)

    const aiMessage = response?.response || 'TODO: ' + userInput

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
        '/api/ai-todo-assist',
        now
      ).run()

      console.log('✓ AI usage recorded')
    }

    // Parse AI response to determine type
    let responseType: 'question' | 'todo' = 'todo'
    let content = aiMessage

    if (aiMessage.toUpperCase().startsWith('QUESTION:')) {
      responseType = 'question'
      content = aiMessage.substring('QUESTION:'.length).trim()
    } else if (aiMessage.toUpperCase().startsWith('TODO:')) {
      responseType = 'todo'
      content = aiMessage.substring('TODO:'.length).trim()
    }

    return new Response(
      JSON.stringify({
        type: responseType,
        content,
        model: modelName
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in AI todo assist:', error)

    // Return a simple fallback
    return new Response(
      JSON.stringify({
        type: 'todo',
        content: (await context.request.json() as any).userInput,
        error: 'AI temporarily unavailable, using your input as-is'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
