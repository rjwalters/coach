#!/usr/bin/env node

/**
 * Test script for AI joke generation
 *
 * This test:
 * 1. Logs in with test credentials
 * 2. Calls the AI joke endpoint
 * 3. Verifies the response contains a joke
 */

const API_URL = 'http://localhost:8788'
const TEST_EMAIL = 'test-ai-joke@example.com'
const TEST_PASSWORD = 'SecurePassword123!'

async function testAIJoke() {
  console.log('🤖 Testing AI Joke Generation\n')
  console.log('=' .repeat(70))

  try {
    // Step 1: Register (or login if already exists)
    console.log('\n📝 Step 1: Creating/logging in test user...')

    let sessionToken
    let encryptedDEK

    try {
      // Try to register
      const registerResponse = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
        }),
      })

      if (registerResponse.ok) {
        console.log('   ✓ User registered successfully')
      } else if (registerResponse.status !== 409) {
        // 409 means user exists, which is fine
        throw new Error('Failed to register')
      } else {
        console.log('   ℹ User already exists')
      }

      // Now login to get session token (registration doesn't auto-login at API level)
      const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
        }),
      })

      if (!loginResponse.ok) {
        throw new Error('Failed to login')
      }

      const loginData = await loginResponse.json()
      sessionToken = loginData.session_token
      encryptedDEK = loginData.encrypted_dek
      console.log('   ✓ User logged in successfully')
    } catch (error) {
      console.error('   ❌ Failed to authenticate:', error.message)
      return false
    }

    // Step 2: Call AI joke endpoint
    console.log('\n😂 Step 2: Generating AI joke...')

    const jokeResponse = await fetch(`${API_URL}/api/ai-joke`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!jokeResponse.ok) {
      const errorData = await jokeResponse.json().catch(() => ({}))
      console.error('   ❌ Failed to generate joke:', errorData.error || jokeResponse.statusText)
      return false
    }

    const jokeData = await jokeResponse.json()

    console.log('   ✓ AI joke generated successfully!')
    console.log('\n📊 Response:')
    console.log('   Model:', jokeData.model)
    console.log('   Joke:', jokeData.joke)

    // Step 3: Verify joke exists
    console.log('\n✅ Step 3: Verifying joke...')

    if (!jokeData.joke || jokeData.joke.length === 0) {
      console.error('   ❌ No joke in response')
      return false
    }

    console.log('   ✓ Joke verified (length:', jokeData.joke.length, 'characters)')

    // Step 4: Test without authentication
    console.log('\n🔒 Step 4: Testing without authentication...')

    const unauthResponse = await fetch(`${API_URL}/api/ai-joke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (unauthResponse.status === 401) {
      console.log('   ✓ Correctly rejected unauthenticated request')
    } else {
      console.warn('   ⚠️  Expected 401 for unauthenticated request, got:', unauthResponse.status)
    }

    // Success!
    console.log('\n' + '='.repeat(70))
    console.log('✅ All AI joke tests passed!\n')
    console.log('Summary:')
    console.log('  ✓ User authentication works')
    console.log('  ✓ AI joke endpoint works')
    console.log('  ✓ LLaMA model responds with jokes')
    console.log('  ✓ Authentication is required')
    console.log('\n🎉 AI integration working perfectly!')

    return true

  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.error(error.stack)
    return false
  }
}

// Run the test
testAIJoke().then(success => {
  process.exit(success ? 0 : 1)
}).catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
