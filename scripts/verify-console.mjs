#!/usr/bin/env node

/**
 * Verify browser console logs are working
 * Uses Playwright to open the app in a headless browser and capture console logs
 */

import { chromium } from 'playwright'

async function verifyConsoleLogs() {
  console.log('🧪 Starting headless browser test...\n')

  const browser = await chromium.launch({
    headless: true,
  })

  const context = await browser.newContext()
  const page = await context.newPage()

  // Collect console logs
  const consoleLogs = []
  page.on('console', (msg) => {
    const text = msg.text()
    consoleLogs.push(text)
    console.log(`  📝 Console ${msg.type()}: ${text}`)
  })

  // Collect errors
  const errors = []
  page.on('pageerror', (error) => {
    errors.push(error.message)
    console.error(`  ❌ Page Error: ${error.message}`)
  })

  try {
    console.log('🌐 Navigating to http://localhost:5173...\n')
    await page.goto('http://localhost:5173', {
      waitUntil: 'networkidle',
      timeout: 10000,
    })

    // Wait a bit for React to initialize
    await page.waitForTimeout(2000)

    console.log('\n✅ Browser test complete!\n')

    // Verify expected console logs
    const hasInitMessage = consoleLogs.some((log) =>
      log.includes('Coach App initialized')
    )
    const hasEnvironment = consoleLogs.some((log) =>
      log.includes('Environment:')
    )
    const hasTimestamp = consoleLogs.some((log) => log.includes('Timestamp:'))

    console.log('📊 Verification Results:')
    console.log(`  ✓ Init message: ${hasInitMessage ? '✅' : '❌'}`)
    console.log(`  ✓ Environment: ${hasEnvironment ? '✅' : '❌'}`)
    console.log(`  ✓ Timestamp: ${hasTimestamp ? '✅' : '❌'}`)
    console.log(`  ✓ Total console messages: ${consoleLogs.length}`)
    console.log(`  ✓ Errors: ${errors.length}`)

    if (errors.length > 0) {
      console.log('\n❌ Errors found:')
      errors.forEach((err) => console.log(`  - ${err}`))
    }

    await browser.close()

    if (hasInitMessage && hasEnvironment && hasTimestamp && errors.length === 0) {
      console.log('\n✅ All checks passed! Console logging is working correctly.')
      process.exit(0)
    } else {
      console.log('\n⚠️  Some checks failed. Please review the output above.')
      process.exit(1)
    }
  } catch (error) {
    console.error('\n❌ Error during test:', error.message)
    await browser.close()
    process.exit(1)
  }
}

verifyConsoleLogs()
