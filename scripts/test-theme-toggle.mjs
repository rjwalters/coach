#!/usr/bin/env node

/**
 * Test theme toggle functionality
 * Clicks the theme toggle button and verifies theme changes via console logs
 */

import { chromium } from 'playwright'

async function testThemeToggle() {
  console.log('🧪 Starting theme toggle test...\n')

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
    console.log(`  📝 ${msg.type()}: ${text}`)
  })

  // Collect errors
  const errors = []
  page.on('pageerror', (error) => {
    errors.push(error.message)
    console.error(`  ❌ Error: ${error.message}`)
  })

  try {
    console.log('🌐 Navigating to http://localhost:5173...\n')
    await page.goto('http://localhost:5173', {
      waitUntil: 'networkidle',
      timeout: 10000,
    })

    // Wait for app to initialize
    await page.waitForTimeout(1000)

    console.log('\n🔍 Looking for theme toggle button...\n')

    // Find the theme toggle button (it has the emoji and text)
    const themeButton = page.locator('button:has-text("Light"), button:has-text("Dark"), button:has-text("System")')
    await themeButton.waitFor({ timeout: 5000 })

    const initialButtonText = await themeButton.textContent()
    console.log(`✓ Found theme button with text: "${initialButtonText}"\n`)

    // Click the button 3 times to cycle through all themes
    console.log('🖱️  Clicking theme toggle button (cycle 1: Light → Dark)...\n')
    await themeButton.click()
    await page.waitForTimeout(500)

    console.log('🖱️  Clicking theme toggle button (cycle 2: Dark → System)...\n')
    await themeButton.click()
    await page.waitForTimeout(500)

    console.log('🖱️  Clicking theme toggle button (cycle 3: System → Light)...\n')
    await themeButton.click()
    await page.waitForTimeout(500)

    console.log('\n✅ Theme toggle test complete!\n')

    // Verify theme changes in console logs
    const themeChangeLogs = consoleLogs.filter(log =>
      log.includes('Theme changed') || log.includes('ThemeToggle clicked')
    )

    const themeProviderLogs = consoleLogs.filter(log =>
      log.includes('ThemeProvider')
    )

    const themeToggleLogs = consoleLogs.filter(log =>
      log.includes('ThemeToggle clicked')
    )

    console.log('📊 Test Results:')
    console.log(`  ✓ Total console messages: ${consoleLogs.length}`)
    console.log(`  ✓ Theme change logs: ${themeChangeLogs.length}`)
    console.log(`  ✓ ThemeProvider logs: ${themeProviderLogs.length}`)
    console.log(`  ✓ ThemeToggle click logs: ${themeToggleLogs.length}`)
    console.log(`  ✓ Errors: ${errors.length}`)

    if (themeToggleLogs.length >= 3) {
      console.log('\n✅ SUCCESS: Theme toggle is working! Found', themeToggleLogs.length, 'toggle clicks')
    } else {
      console.log('\n⚠️  WARNING: Expected at least 3 theme toggle clicks, found', themeToggleLogs.length)
    }

    if (errors.length > 0) {
      console.log('\n❌ Errors found:')
      errors.forEach((err) => console.log(`  - ${err}`))
    }

    // Get final HTML class to verify theme is applied
    const htmlClass = await page.evaluate(() => document.documentElement.className)
    console.log('\n🎨 Final HTML classes:', htmlClass)

    await browser.close()

    if (themeToggleLogs.length >= 3 && errors.length === 0) {
      console.log('\n✅ All theme toggle checks passed!')
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

testThemeToggle()
