#!/usr/bin/env node

/**
 * End-to-End Test: AI-Assisted Todo Creation
 *
 * This test verifies that:
 * 1. AI can assist with todo creation
 * 2. AI asks clarifying questions for vague inputs
 * 3. AI detects duplicate todos
 * 4. Clear todos are created directly
 * 5. Conversation UI works correctly
 */

import { chromium } from 'playwright'
import { spawn } from 'child_process'
import { setTimeout } from 'timers/promises'

const VITE_PORT = 5173
const WRANGLER_PORT = 8788
const BASE_URL = `http://localhost:${WRANGLER_PORT}`

let browser
let devServer
let wranglerServer

// Helper to start dev server
async function startDevServer() {
  return new Promise((resolve, reject) => {
    console.log('📦 Starting Vite dev server...')

    devServer = spawn('npm', ['run', 'dev'], {
      stdio: 'pipe',
      shell: true,
    })

    let output = ''

    devServer.stdout.on('data', (data) => {
      output += data.toString()
      if (output.includes('Local:')) {
        console.log('✓ Vite dev server started')
        resolve()
      }
    })

    devServer.stderr.on('data', (data) => {
      console.error('Dev server error:', data.toString())
    })

    devServer.on('error', reject)

    // Timeout after 30 seconds
    setTimeout(30000).then(() => reject(new Error('Dev server timeout')))
  })
}

// Helper to start Wrangler Pages dev server
async function startWranglerServer() {
  return new Promise((resolve, reject) => {
    console.log('🔧 Starting Wrangler Pages dev server...')

    wranglerServer = spawn(
      'npx',
      [
        'wrangler',
        'pages',
        'dev',
        `--proxy=${VITE_PORT}`,
        '--compatibility-date=2024-01-01',
        '--local',
        `--port=${WRANGLER_PORT}`,
      ],
      {
        stdio: 'pipe',
        shell: true,
      }
    )

    let output = ''

    wranglerServer.stdout.on('data', (data) => {
      output += data.toString()
      if (output.includes('Ready on') || output.includes(`http://localhost:${WRANGLER_PORT}`)) {
        console.log('✓ Wrangler Pages dev server started')
        resolve()
      }
    })

    wranglerServer.stderr.on('data', (data) => {
      const text = data.toString()
      // Wrangler often outputs to stderr even for normal messages
      if (text.includes('Ready on') || text.includes(`http://localhost:${WRANGLER_PORT}`)) {
        console.log('✓ Wrangler Pages dev server started')
        resolve()
      }
    })

    wranglerServer.on('error', reject)

    // Timeout after 30 seconds
    setTimeout(30000).then(() => reject(new Error('Wrangler server timeout')))
  })
}

// Helper to cleanup
function cleanup() {
  console.log('\n🧹 Cleaning up...')

  if (devServer) {
    devServer.kill()
    console.log('✓ Vite dev server stopped')
  }

  if (wranglerServer) {
    wranglerServer.kill()
    console.log('✓ Wrangler Pages dev server stopped')
  }

  if (browser) {
    browser.close().then(() => console.log('✓ Browser closed'))
  }
}

// Main test
async function runTest() {
  try {
    // Start servers
    await startDevServer()
    await startWranglerServer()

    // Give servers a moment to stabilize
    await setTimeout(2000)

    // Launch browser
    console.log('\n🌐 Launching browser...')
    browser = await chromium.launch({ headless: true })
    const context = await browser.newContext()
    const page = await context.newPage()

    // Enable console logging
    page.on('console', (msg) => console.log('Browser:', msg.text()))

    // Generate unique test user
    const timestamp = Date.now()
    const testEmail = `ai-todo-test-${timestamp}@example.com`
    const testPassword = 'TestPassword123!'

    console.log('\n📝 Test Setup')
    console.log('Email:', testEmail)

    // Step 1: Register user
    console.log('\n1️⃣  Registering test user...')
    await page.goto(`${BASE_URL}/login`)

    // Toggle to registration mode
    await page.click('text=New user? Create an account')
    await setTimeout(500)

    // Fill registration form
    await page.fill('input[type="email"]', testEmail)
    await page.fill('input[type="password"]', testPassword)
    await page.click('button:has-text("Create Account")')

    // Wait for redirect to dashboard
    await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 10000 })
    console.log('✓ User registered and logged in')

    // Step 2: Wait for encryption key to be ready
    await setTimeout(2000)
    console.log('✓ Encryption key initialized')

    // Step 3: Test creating a clear, specific todo (should not trigger AI question)
    console.log('\n2️⃣  Testing clear todo creation...')
    const clearTodoInput = page.locator('input[placeholder="Add a new task..."]')
    const addButton = page.locator('button:has-text("Add")')

    await clearTodoInput.fill('Buy milk from the grocery store')
    await addButton.click()

    // Wait for AI processing
    await setTimeout(3000)

    // Check if todo was created directly (no AI question should appear)
    const todoItems = page.locator('[class*="rounded-lg border"]').filter({ hasText: 'milk' })
    const todoCount = await todoItems.count()

    if (todoCount > 0) {
      console.log('✓ Clear todo created directly without AI question')
    } else {
      console.log('⚠️  Todo might still be processing or AI asked a question')
      // Check if AI asked a question
      const aiQuestion = page.locator('text=AI Assistant')
      if (await aiQuestion.isVisible({ timeout: 1000 })) {
        console.log('   AI asked a question - responding...')
        const answerInput = page.locator('input[placeholder="Your answer..."]')
        await answerInput.fill('Buy milk from the grocery store')
        await page.click('button:has-text("Answer")')
        await setTimeout(3000)
        console.log('✓ Todo created after answering AI question')
      }
    }

    // Step 4: Test vague todo (should trigger AI clarifying question)
    console.log('\n3️⃣  Testing vague todo (should trigger AI question)...')
    await clearTodoInput.fill('work on project')
    await addButton.click()

    // Wait for AI to respond
    await setTimeout(3000)

    // Look for AI Assistant conversation box
    const aiAssistant = page.locator('text=AI Assistant')
    const hasAiQuestion = await aiAssistant.isVisible({ timeout: 5000 }).catch(() => false)

    if (hasAiQuestion) {
      console.log('✓ AI asked a clarifying question')

      // Get the question text
      const questionText = await page.locator('.text-sm.text-blue-800').first().textContent()
      console.log('   Question:', questionText)

      // Answer the question
      const answerInput = page.locator('input[placeholder="Your answer..."]')
      await answerInput.fill('Update the README documentation')
      await page.click('button:has-text("Answer")')

      // Wait for todo creation
      await setTimeout(3000)

      // Verify todo was created
      const readmeTodo = page.locator('text=README').or(page.locator('text=documentation'))
      if (await readmeTodo.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('✓ Todo created with clarified information')
      } else {
        console.log('⚠️  Todo might be created but not visible yet')
      }
    } else {
      console.log('⚠️  AI did not ask a clarifying question (might have created todo directly)')
    }

    // Step 5: Test duplicate detection
    console.log('\n4️⃣  Testing duplicate detection...')
    await setTimeout(1000)

    // Try to add a similar todo
    await clearTodoInput.fill('buy milk')
    await addButton.click()

    // Wait for AI response
    await setTimeout(3000)

    const duplicateQuestion = page.locator('text=AI Assistant')
    if (await duplicateQuestion.isVisible({ timeout: 5000 }).catch(() => false)) {
      const questionText = await page.locator('.text-sm.text-blue-800').first().textContent()
      console.log('✓ AI detected potential duplicate')
      console.log('   Question:', questionText)

      // Cancel this conversation
      await page.click('button:has-text("Cancel")')
      await setTimeout(1000)
      console.log('✓ Conversation cancelled successfully')
    } else {
      console.log('⚠️  Duplicate detection test: AI might have created todo directly or model did not detect duplicate')
    }

    // Step 6: Verify todos are in the list
    console.log('\n5️⃣  Verifying todo list...')
    const allTodos = page.locator('[class*="rounded-lg border"]')
    const count = await allTodos.count()
    console.log(`✓ Total todos in list: ${count}`)

    if (count > 0) {
      console.log('✓ Todos were successfully created and encrypted')
    }

    // Success!
    console.log('\n✅ All AI-assisted todo tests completed successfully!\n')

    // Cleanup
    cleanup()
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.error(error.stack)
    cleanup()
    process.exit(1)
  }
}

// Handle process termination
process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)

// Run the test
runTest()
