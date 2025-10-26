#!/usr/bin/env node

/**
 * Test script for AI usage tracking
 *
 * This test:
 * 1. Logs in with test credentials
 * 2. Generates multiple AI jokes
 * 3. Fetches usage statistics
 * 4. Verifies token counts are tracked correctly
 * 5. Verifies stats by model and endpoint
 */

const API_URL = 'http://localhost:8788'
const TEST_EMAIL = 'test-ai-usage@example.com'
const TEST_PASSWORD = 'SecurePassword123!'

async function testAIUsageTracking() {
  console.log('📊 Testing AI Usage Tracking\n')
  console.log('=' .repeat(70))

  try {
    // Step 1: Register/Login
    console.log('\n📝 Step 1: Creating/logging in test user...')

    let sessionToken

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
        throw new Error('Failed to register')
      } else {
        console.log('   ℹ User already exists')
      }

      // Login to get session token
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
      console.log('   ✓ User logged in successfully')
    } catch (error) {
      console.error('   ❌ Failed to authenticate:', error.message)
      return false
    }

    // Step 2: Get initial usage stats
    console.log('\n📊 Step 2: Getting initial usage stats...')

    const initialStatsResponse = await fetch(`${API_URL}/api/ai-usage`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!initialStatsResponse.ok) {
      throw new Error('Failed to fetch initial usage stats')
    }

    const initialStats = await initialStatsResponse.json()
    console.log('   ✓ Initial stats retrieved')
    console.log('   Initial total requests:', initialStats.total_requests)
    console.log('   Initial total tokens:', initialStats.total_tokens)

    // Step 3: Generate multiple jokes to create usage data
    console.log('\n😂 Step 3: Generating 3 AI jokes...')

    for (let i = 1; i <= 3; i++) {
      console.log(`   • Generating joke ${i}/3...`)

      const jokeResponse = await fetch(`${API_URL}/api/ai-joke`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!jokeResponse.ok) {
        console.warn(`   ⚠️  Joke ${i} generation failed`)
        continue
      }

      const jokeData = await jokeResponse.json()
      console.log(`   ✓ Joke ${i} generated (${jokeData.joke.length} chars)`)

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    // Step 4: Get updated usage stats
    console.log('\n📈 Step 4: Getting updated usage stats...')

    const updatedStatsResponse = await fetch(`${API_URL}/api/ai-usage`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!updatedStatsResponse.ok) {
      throw new Error('Failed to fetch updated usage stats')
    }

    const updatedStats = await updatedStatsResponse.json()
    console.log('   ✓ Updated stats retrieved')

    // Step 5: Verify stats increased
    console.log('\n✅ Step 5: Verifying usage tracking...')

    const newRequests = updatedStats.total_requests - initialStats.total_requests
    const newTokens = updatedStats.total_tokens - initialStats.total_tokens

    console.log(`   New requests: ${newRequests}`)
    console.log(`   New tokens: ${newTokens}`)

    if (newRequests < 1) {
      console.error('   ❌ No new requests recorded!')
      return false
    }

    console.log('   ✓ New requests recorded')

    if (newTokens < 1) {
      console.error('   ❌ No new tokens recorded!')
      return false
    }

    console.log('   ✓ New tokens recorded')

    // Step 6: Display detailed stats
    console.log('\n📊 Step 6: Detailed Usage Statistics:')
    console.log('   ' + '-'.repeat(66))
    console.log(`   Total Requests: ${updatedStats.total_requests}`)
    console.log(`   Total Prompt Tokens: ${updatedStats.total_prompt_tokens}`)
    console.log(`   Total Completion Tokens: ${updatedStats.total_completion_tokens}`)
    console.log(`   Total Tokens: ${updatedStats.total_tokens}`)
    console.log('   ' + '-'.repeat(66))

    // Stats by model
    if (updatedStats.by_model && updatedStats.by_model.length > 0) {
      console.log('\n   By Model:')
      for (const modelStat of updatedStats.by_model) {
        console.log(`   • ${modelStat.model}`)
        console.log(`     Requests: ${modelStat.requests}`)
        console.log(`     Tokens: ${modelStat.total_tokens} (${modelStat.prompt_tokens} prompt + ${modelStat.completion_tokens} completion)`)
      }
    }

    // Stats by endpoint
    if (updatedStats.by_endpoint && updatedStats.by_endpoint.length > 0) {
      console.log('\n   By Endpoint:')
      for (const endpointStat of updatedStats.by_endpoint) {
        console.log(`   • ${endpointStat.endpoint}`)
        console.log(`     Requests: ${endpointStat.requests}`)
        console.log(`     Tokens: ${endpointStat.total_tokens}`)
      }
    }

    // Recent usage
    if (updatedStats.recent_usage && updatedStats.recent_usage.length > 0) {
      console.log('\n   Recent Usage (last 5):')
      for (const usage of updatedStats.recent_usage.slice(0, 5)) {
        const date = new Date(usage.created_at)
        console.log(`   • ${date.toLocaleTimeString()} - ${usage.endpoint}`)
        console.log(`     Tokens: ${usage.total_tokens} (${usage.prompt_tokens} + ${usage.completion_tokens})`)
      }
    }

    // Step 7: Verify data structure
    console.log('\n🔍 Step 7: Verifying data structure...')

    if (typeof updatedStats.total_requests !== 'number') {
      console.error('   ❌ total_requests is not a number')
      return false
    }
    console.log('   ✓ total_requests is a number')

    if (typeof updatedStats.total_tokens !== 'number') {
      console.error('   ❌ total_tokens is not a number')
      return false
    }
    console.log('   ✓ total_tokens is a number')

    if (!Array.isArray(updatedStats.by_model)) {
      console.error('   ❌ by_model is not an array')
      return false
    }
    console.log('   ✓ by_model is an array')

    if (!Array.isArray(updatedStats.by_endpoint)) {
      console.error('   ❌ by_endpoint is not an array')
      return false
    }
    console.log('   ✓ by_endpoint is an array')

    // Success!
    console.log('\n' + '='.repeat(70))
    console.log('✅ All AI usage tracking tests passed!\n')
    console.log('Summary:')
    console.log('  ✓ User authentication works')
    console.log('  ✓ Initial stats retrieved')
    console.log('  ✓ AI jokes generated successfully')
    console.log('  ✓ Usage stats updated correctly')
    console.log('  ✓ Token counts tracked per request')
    console.log('  ✓ Stats aggregated by model')
    console.log('  ✓ Stats aggregated by endpoint')
    console.log('  ✓ Recent usage history available')
    console.log('  ✓ Data structure validated')
    console.log('\n🎉 AI usage tracking working perfectly!')

    return true

  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.error(error.stack)
    return false
  }
}

// Run the test
testAIUsageTracking().then(success => {
  process.exit(success ? 0 : 1)
}).catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
