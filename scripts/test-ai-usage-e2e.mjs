#!/usr/bin/env node

/**
 * End-to-end test for AI usage tracking
 *
 * This test:
 * 1. Starts the dev server
 * 2. Logs in with test credentials
 * 3. Generates multiple AI jokes in the browser
 * 4. Fetches usage statistics via the API
 * 5. Verifies token counts are tracked correctly
 * 6. Verifies usage is stored in the database
 */

import { chromium } from 'playwright'
import { spawn, exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const APP_URL = 'http://localhost:8788'
const TEST_EMAIL = 'test-ai-usage-e2e@example.com'
const TEST_PASSWORD = 'SecurePassword123!'

let server = null

// Helper to start the dev server
async function startServer() {
  console.log('📦 Building application...')
  await execAsync('npm run build')
  console.log('   ✓ Build complete')

  console.log('\n🚀 Starting dev server...')

  // Kill any existing process on port 8788
  try {
    await execAsync('lsof -ti:8788 | xargs kill -9 2>/dev/null || true')
  } catch (e) {
    // Ignore errors
  }

  return new Promise((resolve, reject) => {
    server = spawn('npx', [
      'wrangler',
      'pages',
      'dev',
      './dist',
      '--compatibility-date=2024-01-01',
      '--local',
      '--port=8788'
    ], {
      stdio: ['ignore', 'pipe', 'pipe']
    })

    let started = false

    server.stdout.on('data', (data) => {
      const output = data.toString()
      if (output.includes('Ready on') || output.includes('http://')) {
        if (!started) {
          started = true
          setTimeout(() => resolve(), 2000)
        }
      }
    })

    server.stderr.on('data', (data) => {
      const output = data.toString()
      if (output.includes('Ready on') || output.includes('http://')) {
        if (!started) {
          started = true
          setTimeout(() => resolve(), 2000)
        }
      }
    })

    server.on('error', reject)

    setTimeout(() => {
      if (!started) {
        reject(new Error('Server failed to start within 30 seconds'))
      }
    }, 30000)
  })
}

// Helper to stop the dev server
function stopServer() {
  if (server) {
    console.log('\n🛑 Stopping dev server...')
    server.kill()
  }
}

// Helper to verify database has usage records
async function verifyDatabaseHasUsage(email) {
  console.log('\n🔍 Verifying usage in database...')

  try {
    const { stdout } = await execAsync(
      `npx wrangler d1 execute coach-db --local --command "SELECT COUNT(*) as count FROM ai_usage WHERE user_id IN (SELECT id FROM users WHERE email='${email}')"`
    )

    const hasUsageData = stdout.includes('count') && !stdout.includes('| 0')

    if (hasUsageData) {
      console.log('   ✓ Usage records found in database')
      return true
    } else {
      console.log('   ❌ No usage records found in database')
      return false
    }
  } catch (error) {
    console.error('   ❌ Failed to query database:', error.message)
    return false
  }
}

// Main test function
async function runE2ETest() {
  console.log('📊 End-to-End AI Usage Tracking Test\n')
  console.log('=' .repeat(70))

  let browser
  let page

  try {
    // Start server
    await startServer()
    console.log('   ✓ Server started on', APP_URL)

    // Launch browser
    console.log('\n🌐 Launching browser...')
    browser = await chromium.launch({
      headless: true, // Set to false to watch the test
    })
    page = await browser.newPage()
    console.log('   ✓ Browser launched')

    // Step 1: Navigate to app and register/login
    console.log('\n📝 Step 1: Register/login test user...')
    await page.goto(APP_URL)
    await page.waitForLoadState('networkidle')

    const hasLoginButton = await page.locator('button:has-text("Login")').count() > 0

    if (hasLoginButton) {
      console.log('   • Switching to registration mode...')
      const hasCreateAccountLink = await page.locator('text=New user? Create an account').count() > 0

      if (hasCreateAccountLink) {
        await page.click('text=New user? Create an account')
      }

      await page.fill('input[type="email"]', TEST_EMAIL)
      await page.fill('input[type="password"]', TEST_PASSWORD)
      await page.click('button:has-text("Create Account")')

      try {
        await page.waitForURL('**/dashboard', { timeout: 5000 })
        console.log('   ✓ User registered and logged in')
      } catch (e) {
        console.log('   • User exists, logging in...')
        await page.click('text=Already have an account? Login')
        await page.fill('input[type="email"]', TEST_EMAIL)
        await page.fill('input[type="password"]', TEST_PASSWORD)
        await page.click('button:has-text("Login")')
        await page.waitForURL('**/dashboard', { timeout: 5000 })
        console.log('   ✓ Logged in successfully')
      }
    }

    // Step 2: Get session token from localStorage
    console.log('\n🔑 Step 2: Retrieving session token...')
    const sessionToken = await page.evaluate(() => {
      return localStorage.getItem('coach_session_token')
    })

    if (!sessionToken) {
      throw new Error('No session token found in localStorage')
    }
    console.log('   ✓ Session token retrieved')

    // Step 3: Get initial usage stats via API
    console.log('\n📊 Step 3: Fetching initial usage stats...')

    const initialStats = await page.evaluate(async (token) => {
      const response = await fetch('/api/ai-usage', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      return response.json()
    }, sessionToken)

    console.log('   ✓ Initial stats retrieved')
    console.log(`   Initial requests: ${initialStats.total_requests}`)
    console.log(`   Initial tokens: ${initialStats.total_tokens}`)

    // Step 4: Generate AI jokes via UI
    console.log('\n😂 Step 4: Generating AI jokes via UI...')

    const jokeButton = page.locator('button:has-text("Get AI Joke")')
    await jokeButton.waitFor({ state: 'visible', timeout: 10000 })
    console.log('   ✓ Joke button found')

    const jokesToGenerate = 2
    for (let i = 1; i <= jokesToGenerate; i++) {
      console.log(`   • Generating joke ${i}/${jokesToGenerate}...`)
      await jokeButton.click()

      // Wait for loading state
      await page.waitForSelector('button:has-text("Generating..."):disabled', { timeout: 2000 }).catch(() => {})

      // Wait for completion
      await page.waitForSelector('button:has-text("Get AI Joke"):not(:disabled)', { timeout: 15000 })
      console.log(`   ✓ Joke ${i} generated`)

      // Small delay between requests
      await page.waitForTimeout(500)
    }

    // Step 5: Verify usage stats updated
    console.log('\n📈 Step 5: Verifying usage stats updated...')

    const updatedStats = await page.evaluate(async (token) => {
      const response = await fetch('/api/ai-usage', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      return response.json()
    }, sessionToken)

    console.log('   ✓ Updated stats retrieved')
    console.log(`   Updated requests: ${updatedStats.total_requests}`)
    console.log(`   Updated tokens: ${updatedStats.total_tokens}`)

    const newRequests = updatedStats.total_requests - initialStats.total_requests
    const newTokens = updatedStats.total_tokens - initialStats.total_tokens

    if (newRequests < jokesToGenerate) {
      throw new Error(`Expected at least ${jokesToGenerate} new requests, got ${newRequests}`)
    }
    console.log(`   ✓ ${newRequests} new requests recorded`)

    if (newTokens < 1) {
      throw new Error('Expected token usage to increase')
    }
    console.log(`   ✓ ${newTokens} new tokens recorded`)

    // Step 6: Verify stats structure
    console.log('\n🔍 Step 6: Verifying stats structure...')

    if (!Array.isArray(updatedStats.by_model)) {
      throw new Error('by_model should be an array')
    }
    console.log('   ✓ by_model is an array')

    if (updatedStats.by_model.length === 0) {
      throw new Error('by_model should have at least one entry')
    }
    console.log(`   ✓ by_model has ${updatedStats.by_model.length} entries`)

    if (!Array.isArray(updatedStats.by_endpoint)) {
      throw new Error('by_endpoint should be an array')
    }
    console.log('   ✓ by_endpoint is an array')

    if (updatedStats.by_endpoint.length === 0) {
      throw new Error('by_endpoint should have at least one entry')
    }
    console.log(`   ✓ by_endpoint has ${updatedStats.by_endpoint.length} entries`)

    if (!Array.isArray(updatedStats.recent_usage)) {
      throw new Error('recent_usage should be an array')
    }
    console.log('   ✓ recent_usage is an array')

    // Step 7: Display detailed stats
    console.log('\n📊 Step 7: Detailed Usage Statistics:')
    console.log('   ' + '-'.repeat(66))
    console.log(`   Total Requests: ${updatedStats.total_requests}`)
    console.log(`   Total Prompt Tokens: ${updatedStats.total_prompt_tokens}`)
    console.log(`   Total Completion Tokens: ${updatedStats.total_completion_tokens}`)
    console.log(`   Total Tokens: ${updatedStats.total_tokens}`)
    console.log('   ' + '-'.repeat(66))

    if (updatedStats.by_model.length > 0) {
      console.log('\n   By Model:')
      for (const modelStat of updatedStats.by_model) {
        console.log(`   • ${modelStat.model}`)
        console.log(`     Requests: ${modelStat.requests}`)
        console.log(`     Tokens: ${modelStat.total_tokens}`)
      }
    }

    if (updatedStats.by_endpoint.length > 0) {
      console.log('\n   By Endpoint:')
      for (const endpointStat of updatedStats.by_endpoint) {
        console.log(`   • ${endpointStat.endpoint}`)
        console.log(`     Requests: ${endpointStat.requests}`)
        console.log(`     Tokens: ${endpointStat.total_tokens}`)
      }
    }

    // Step 8: Verify database has usage records
    const dbHasUsage = await verifyDatabaseHasUsage(TEST_EMAIL)
    if (!dbHasUsage) {
      throw new Error('Database verification failed')
    }

    // Success!
    console.log('\n' + '='.repeat(70))
    console.log('✅ All E2E AI usage tracking tests passed!\n')
    console.log('Summary:')
    console.log('  ✓ User authentication works')
    console.log('  ✓ Dashboard loads correctly')
    console.log('  ✓ Initial stats retrieved via API')
    console.log('  ✓ AI jokes generated via UI button')
    console.log('  ✓ Usage stats updated after generation')
    console.log('  ✓ Token counts tracked correctly')
    console.log('  ✓ Stats structure validated')
    console.log('  ✓ Stats aggregated by model')
    console.log('  ✓ Stats aggregated by endpoint')
    console.log('  ✓ Recent usage history available')
    console.log('  ✓ Database contains usage records')
    console.log('\n🎉 AI usage tracking working perfectly end-to-end!')

    return true

  } catch (error) {
    console.error('\n❌ E2E Test failed:', error.message)

    if (page) {
      const screenshotPath = '/tmp/coach-ai-usage-e2e-failure.png'
      await page.screenshot({ path: screenshotPath })
      console.log(`\n📸 Screenshot saved to: ${screenshotPath}`)
      console.log('\n📄 Page URL:', page.url())
    }

    return false

  } finally {
    if (browser) {
      await browser.close()
      console.log('\n🔚 Browser closed')
    }
    stopServer()
  }
}

// Run the test
runE2ETest().then(success => {
  process.exit(success ? 0 : 1)
}).catch(error => {
  console.error('Fatal error:', error)
  stopServer()
  process.exit(1)
})
