#!/usr/bin/env node

import { chromium } from 'playwright'

const BASE_URL = 'http://localhost:8788'

async function testAuthFlow() {
  console.log('🚀 Starting authentication flow test...\n')

  const browser = await chromium.launch({
    headless: true,
  })

  try {
    const context = await browser.newContext()
    const page = await context.newPage()

    // Collect console logs
    const consoleLogs = []
    page.on('console', (msg) => {
      const text = msg.text()
      consoleLogs.push(text)
      console.log(`[Browser Console] ${text}`)
    })

    // Test 1: Navigate to login page
    console.log('\n📍 Test 1: Navigate to login page')
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
    console.log('✅ Page loaded successfully')

    // Test 2: Switch to registration mode
    console.log('\n📍 Test 2: Switch to registration mode')
    const newUserButton = page.locator('text=New user? Create an account')
    await newUserButton.click()
    await page.waitForTimeout(1000)

    const createAccountButton = page.locator('button[type="submit"]:has-text("Create Account")')
    await createAccountButton.waitFor({ state: 'visible', timeout: 5000 })
    const isVisible = await createAccountButton.isVisible()
    console.log(`✅ Registration form displayed: ${isVisible}`)

    // Test 3: Register a new user
    console.log('\n📍 Test 3: Register a new user')
    const testEmail = `test-${Date.now()}@example.com`
    const testPassword = 'TestPassword123!'

    // Wait for inputs to be ready after form state change
    await page.waitForTimeout(500)

    const emailInput = page.locator('input[id="email"]')
    const passwordInput = page.locator('input[id="password"]')

    await emailInput.fill(testEmail)
    await passwordInput.fill(testPassword)

    console.log(`   Email: ${testEmail}`)
    console.log(`   Password: ${testPassword}`)

    await createAccountButton.click()
    console.log('   Clicked Create Account button')

    // Wait for navigation to dashboard or error
    await page.waitForTimeout(2000)

    const currentUrl = page.url()
    console.log(`   Current URL: ${currentUrl}`)

    if (currentUrl.includes('/dashboard')) {
      console.log('✅ Registration successful - redirected to dashboard')
    } else {
      const errorMessage = await page.locator('text=error').first().textContent().catch(() => null)
      if (errorMessage) {
        console.log(`❌ Registration failed with error: ${errorMessage}`)
      } else {
        console.log('❌ Registration did not redirect to dashboard')
      }
    }

    // Test 4: Logout
    console.log('\n📍 Test 4: Logout')
    const logoutButton = page.locator('button:has-text("Logout")')
    if (await logoutButton.isVisible()) {
      await logoutButton.click()
      await page.waitForTimeout(1000)

      const afterLogoutUrl = page.url()
      if (afterLogoutUrl === BASE_URL || afterLogoutUrl === `${BASE_URL}/`) {
        console.log('✅ Logout successful - redirected to login page')
      } else {
        console.log(`❌ Logout did not redirect correctly. URL: ${afterLogoutUrl}`)
      }
    } else {
      console.log('⚠️  Logout button not found - may not have logged in successfully')
    }

    // Test 5: Login with existing user
    console.log('\n📍 Test 5: Login with existing user')
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')

    await page.waitForTimeout(500)

    const loginEmailInput = page.locator('input[id="email"]')
    const loginPasswordInput = page.locator('input[id="password"]')

    await loginEmailInput.fill(testEmail)
    await loginPasswordInput.fill(testPassword)

    const loginButton = page.locator('button[type="submit"]:has-text("Login")')
    await loginButton.click()
    console.log('   Clicked Login button')

    await page.waitForTimeout(2000)

    const finalUrl = page.url()
    console.log(`   Final URL: ${finalUrl}`)

    if (finalUrl.includes('/dashboard')) {
      console.log('✅ Login successful - redirected to dashboard')
    } else {
      console.log('❌ Login failed')
    }

    // Test 6: Session persistence
    console.log('\n📍 Test 6: Session persistence (page reload)')
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    const afterReloadUrl = page.url()
    if (afterReloadUrl.includes('/dashboard')) {
      console.log('✅ Session persisted after reload')
    } else {
      console.log('❌ Session did not persist after reload')
    }

    // Check console logs for authentication messages
    console.log('\n📋 Authentication-related console logs:')
    const authLogs = consoleLogs.filter(log =>
      log.includes('✓') ||
      log.includes('Registration') ||
      log.includes('Login') ||
      log.includes('Session') ||
      log.includes('error')
    )

    if (authLogs.length > 0) {
      authLogs.forEach(log => console.log(`   ${log}`))
    } else {
      console.log('   No authentication-related logs found')
    }

    console.log('\n✨ Test completed successfully!')
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message)
    process.exit(1)
  } finally {
    await browser.close()
  }
}

testAuthFlow()
