#!/usr/bin/env node

/**
 * End-to-end test for AI joke generation
 *
 * This test:
 * 1. Starts the dev server
 * 2. Logs in with test credentials
 * 3. Clicks the "Get AI Joke" button
 * 4. Verifies a joke is generated and displayed
 * 5. Verifies the joke content is reasonable
 * 6. Tests multiple joke generations
 */

import { chromium } from 'playwright'
import { spawn, exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const APP_URL = 'http://localhost:8788'
const TEST_EMAIL = 'test-ai-e2e@example.com'
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
          setTimeout(() => resolve(), 2000) // Give it 2 more seconds to be fully ready
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

    // Timeout after 30 seconds
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

// Main test function
async function runE2ETest() {
  console.log('🤖 End-to-End AI Joke Generation Test\n')
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

    // Check if we're on login page
    const hasLoginButton = await page.locator('button:has-text("Login")').count() > 0

    if (hasLoginButton) {
      // Try to register (might fail if user exists, that's ok)
      console.log('   • Switching to registration mode...')

      // Click "New user? Create an account" link
      const hasCreateAccountLink = await page.locator('text=New user? Create an account').count() > 0
      if (hasCreateAccountLink) {
        await page.click('text=New user? Create an account')
        console.log('   • Switched to registration mode')
      }

      await page.fill('input[type="email"]', TEST_EMAIL)
      await page.fill('input[type="password"]', TEST_PASSWORD)

      console.log('   • Attempting to create account...')
      await page.click('button:has-text("Create Account")')

      // Wait for either dashboard or error
      try {
        await page.waitForURL('**/dashboard', { timeout: 5000 })
        console.log('   ✓ User registered and logged in')
      } catch (e) {
        // User might already exist, try logging in
        console.log('   • User already exists, switching to login...')

        // Switch back to login mode
        await page.click('text=Already have an account? Login')
        await page.fill('input[type="email"]', TEST_EMAIL)
        await page.fill('input[type="password"]', TEST_PASSWORD)
        await page.click('button:has-text("Login")')
        await page.waitForURL('**/dashboard', { timeout: 5000 })
        console.log('   ✓ Logged in successfully')
      }
    }

    // Step 2: Verify we're on dashboard
    console.log('\n🏠 Step 2: Verifying dashboard loaded...')
    const url = page.url()
    if (!url.includes('/dashboard')) {
      throw new Error('Not on dashboard page')
    }
    console.log('   ✓ Dashboard loaded')

    // Step 3: Find the AI Joke button
    console.log('\n🔍 Step 3: Locating "Get AI Joke" button...')

    // Wait for the Secret Note section to load
    await page.waitForSelector('h3:has-text("Secret Note")', { timeout: 10000 })
    console.log('   ✓ Secret Note section found')

    // Find the joke button
    const jokeButton = page.locator('button:has-text("Get AI Joke")')
    await jokeButton.waitFor({ state: 'visible', timeout: 5000 })
    console.log('   ✓ "Get AI Joke" button found')

    // Step 4: Click the button and generate a joke
    console.log('\n😂 Step 4: Clicking "Get AI Joke" button...')
    await jokeButton.click()
    console.log('   ✓ Button clicked')

    // Wait for loading state to finish
    console.log('   • Waiting for AI to generate joke...')
    await page.waitForSelector('button:has-text("Get AI Joke"):not(:disabled)', { timeout: 15000 })
    console.log('   ✓ Joke generation complete')

    // Step 5: Verify joke appears
    console.log('\n🎯 Step 5: Verifying joke is displayed...')

    // Look for the joke card
    const jokeCard = page.locator('div:has-text("AI Joke")').first()
    await jokeCard.waitFor({ state: 'visible', timeout: 5000 })
    console.log('   ✓ Joke card appeared')

    // Get the joke text
    const jokeText = await jokeCard.innerText()
    console.log('   ✓ Joke text extracted')

    // Verify joke has reasonable content
    if (!jokeText || jokeText.length < 10) {
      throw new Error('Joke text is too short or empty')
    }
    console.log(`   ✓ Joke length: ${jokeText.length} characters`)

    // Print the joke
    console.log('\n📝 Generated Joke:')
    console.log('   ' + '-'.repeat(66))
    // Extract just the joke part (after "AI Joke" header)
    const jokeLines = jokeText.split('\n').filter(line =>
      line.trim() &&
      !line.includes('AI Joke')
    )
    for (const line of jokeLines) {
      console.log('   ' + line)
    }
    console.log('   ' + '-'.repeat(66))

    // Step 6: Generate another joke to test multiple calls
    console.log('\n🔄 Step 6: Testing multiple joke generations...')

    await jokeButton.click()
    console.log('   • Clicked for second joke')

    await page.waitForSelector('button:has-text("Generating..."):disabled', { timeout: 2000 })
    console.log('   • Button shows loading state')

    await page.waitForSelector('button:has-text("Get AI Joke"):not(:disabled)', { timeout: 15000 })
    console.log('   ✓ Second joke generated')

    const secondJokeText = await jokeCard.innerText()

    if (secondJokeText.length < 10) {
      throw new Error('Second joke is too short')
    }
    console.log('   ✓ Second joke verified')

    // Check if jokes are different (they should be, most of the time)
    if (jokeText === secondJokeText) {
      console.log('   ⚠️  Warning: Both jokes are identical (could happen occasionally)')
    } else {
      console.log('   ✓ Jokes are different (as expected)')
    }

    // Step 7: Verify button states
    console.log('\n✅ Step 7: Verifying button states...')

    const isButtonEnabled = await jokeButton.isEnabled()
    if (!isButtonEnabled) {
      throw new Error('Button should be enabled after joke generation')
    }
    console.log('   ✓ Button is enabled after generation')

    const buttonText = await jokeButton.innerText()
    if (!buttonText.includes('Get AI Joke')) {
      throw new Error('Button text should be "Get AI Joke" when ready')
    }
    console.log('   ✓ Button text is correct')

    // Success!
    console.log('\n' + '='.repeat(70))
    console.log('✅ All E2E AI joke tests passed!\n')
    console.log('Summary:')
    console.log('  ✓ User authentication works')
    console.log('  ✓ Dashboard loads correctly')
    console.log('  ✓ Secret Note section displays')
    console.log('  ✓ "Get AI Joke" button is visible')
    console.log('  ✓ Button click triggers joke generation')
    console.log('  ✓ Loading state shows during generation')
    console.log('  ✓ Joke appears in UI after generation')
    console.log('  ✓ Joke content is reasonable')
    console.log('  ✓ Multiple joke generations work')
    console.log('  ✓ Button states work correctly')
    console.log('\n🎉 AI joke feature working perfectly in browser!')

    return true

  } catch (error) {
    console.error('\n❌ E2E Test failed:', error.message)

    if (page) {
      // Take screenshot on failure
      const screenshotPath = '/tmp/coach-ai-joke-e2e-failure.png'
      await page.screenshot({ path: screenshotPath })
      console.log(`\n📸 Screenshot saved to: ${screenshotPath}`)

      // Print page content for debugging
      console.log('\n📄 Page URL:', page.url())

      // Check if joke button exists
      const jokeButtonCount = await page.locator('button:has-text("Get AI Joke")').count()
      console.log('   "Get AI Joke" button count:', jokeButtonCount)
    }

    return false

  } finally {
    // Cleanup
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
