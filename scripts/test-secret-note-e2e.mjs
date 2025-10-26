#!/usr/bin/env node

/**
 * End-to-end test for encrypted secret note
 *
 * This test:
 * 1. Starts the dev server
 * 2. Logs in with test credentials
 * 3. Writes a secret note
 * 4. Verifies it's encrypted in the database
 * 5. Logs out
 * 6. Verifies the note is not accessible when logged out
 * 7. Logs back in
 * 8. Verifies the secret note is visible in cleartext
 */

import { chromium } from 'playwright'
import { spawn, exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const APP_URL = 'http://localhost:8788'
const TEST_EMAIL = 'test-note-e2e@example.com'
const TEST_PASSWORD = 'SecurePassword123!'
const SECRET_NOTE_TEXT = `This is my super secret note! 🔐

Top Secret Information:
- My favorite color: Purple
- Secret project name: Operation Moonlight
- Hidden treasure location: Behind the waterfall

This note should be encrypted in the database and only visible when I'm logged in.

Timestamp: ${new Date().toISOString()}`

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

// Helper to verify database encryption
async function verifyDatabaseEncryption() {
  console.log('\n🔍 Verifying note is encrypted in database...')

  const { stdout } = await execAsync(
    `npx wrangler d1 execute coach-db --local --command "SELECT encrypted_secret_note FROM users WHERE email='${TEST_EMAIL}'"`
  )

  const hasEncryptedData = stdout.includes('encrypted_secret_note')

  if (hasEncryptedData && !stdout.includes(SECRET_NOTE_TEXT.substring(0, 20))) {
    console.log('   ✓ Note is encrypted in database (no plaintext found)')
    return true
  } else if (stdout.includes(SECRET_NOTE_TEXT.substring(0, 20))) {
    console.log('   ❌ SECURITY ISSUE: Found plaintext in database!')
    return false
  } else {
    console.log('   ℹ No note found in database yet')
    return false
  }
}

// Main test function
async function runE2ETest() {
  console.log('🧪 End-to-End Secret Note Encryption Test\n')
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

    // Step 2: Write secret note
    console.log('\n✍️  Step 2: Writing secret note...')

    // Wait for the secret note textarea to be visible
    await page.waitForSelector('textarea', { timeout: 10000 })

    // Find the textarea in the Secret Note section
    const textarea = page.locator('textarea').first()
    await textarea.fill(SECRET_NOTE_TEXT)
    console.log('   ✓ Secret note written to textarea')

    // Click save button
    await page.click('button:has-text("Save Note")')

    // Wait for save to complete
    await page.waitForSelector('text=Last saved:', { timeout: 5000 })
    console.log('   ✓ Secret note saved')

    // Step 3: Verify database encryption
    const isEncrypted = await verifyDatabaseEncryption()
    if (!isEncrypted) {
      throw new Error('Note is not properly encrypted in database!')
    }

    // Step 4: Verify note is visible in cleartext
    console.log('\n👀 Step 3: Verifying note is visible in cleartext...')
    const noteValue = await textarea.inputValue()
    if (noteValue === SECRET_NOTE_TEXT) {
      console.log('   ✓ Secret note is visible in cleartext while logged in')
    } else {
      throw new Error('Note content does not match!')
    }

    // Step 5: Logout
    console.log('\n🚪 Step 4: Logging out...')
    await page.click('button:has-text("Logout")')
    await page.waitForURL('**/login', { timeout: 5000 })
    console.log('   ✓ Logged out successfully')

    // Step 6: Verify note is not accessible when logged out
    console.log('\n🔒 Step 5: Verifying note is not accessible when logged out...')

    // Try to navigate directly to dashboard
    await page.goto(APP_URL + '/dashboard')
    await page.waitForLoadState('networkidle')

    // Should be redirected to login
    const currentUrl = page.url()
    if (currentUrl.includes('/login')) {
      console.log('   ✓ Redirected to login (dashboard protected)')
    } else {
      throw new Error('Dashboard should not be accessible when logged out!')
    }

    // Verify no secret note is visible
    const textareaCount = await page.locator('textarea').count()
    if (textareaCount === 0) {
      console.log('   ✓ Secret note textarea not visible when logged out')
    } else {
      throw new Error('Secret note should not be accessible when logged out!')
    }

    // Step 7: Login again
    console.log('\n🔑 Step 6: Logging back in...')
    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', TEST_PASSWORD)
    await page.click('button:has-text("Login")')
    await page.waitForURL('**/dashboard', { timeout: 5000 })
    console.log('   ✓ Logged back in successfully')

    // Step 8: Verify note is still there in cleartext
    console.log('\n🎯 Step 7: Verifying secret note reappears after login...')

    // Wait for textarea to load
    await page.waitForSelector('textarea', { timeout: 10000 })

    // Give the decryption a moment
    await page.waitForTimeout(1000)

    const reloadedNoteValue = await page.locator('textarea').first().inputValue()

    if (reloadedNoteValue === SECRET_NOTE_TEXT) {
      console.log('   ✓ Secret note successfully decrypted and displayed!')
      console.log('   ✓ Note content matches original')
    } else {
      console.log('   ❌ Note content does not match!')
      console.log('   Expected length:', SECRET_NOTE_TEXT.length)
      console.log('   Actual length:', reloadedNoteValue.length)
      throw new Error('Note was not properly restored after re-login!')
    }

    // Success!
    console.log('\n' + '='.repeat(70))
    console.log('✅ All E2E tests passed!\n')
    console.log('Summary:')
    console.log('  ✓ Registered/logged in test user')
    console.log('  ✓ Wrote secret note in browser')
    console.log('  ✓ Note encrypted in database (no plaintext)')
    console.log('  ✓ Note visible in cleartext while logged in')
    console.log('  ✓ Logged out successfully')
    console.log('  ✓ Dashboard protected when logged out')
    console.log('  ✓ Secret note not accessible when logged out')
    console.log('  ✓ Logged back in successfully')
    console.log('  ✓ Secret note decrypted and displayed correctly')
    console.log('\n🎉 End-to-end encryption working perfectly!')

    return true

  } catch (error) {
    console.error('\n❌ E2E Test failed:', error.message)

    if (page) {
      // Take screenshot on failure
      const screenshotPath = '/tmp/coach-e2e-failure.png'
      await page.screenshot({ path: screenshotPath })
      console.log(`\n📸 Screenshot saved to: ${screenshotPath}`)

      // Print page content for debugging
      console.log('\n📄 Page URL:', page.url())
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
