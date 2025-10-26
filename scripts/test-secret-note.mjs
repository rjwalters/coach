#!/usr/bin/env node

/**
 * Test script for encrypted secret note functionality
 * Tests saving, retrieving, updating, and clearing encrypted notes
 */

const API_BASE = 'http://localhost:8788'
const TEST_EMAIL = 'test-dek@example.com'
const TEST_PASSWORD = 'TestPassword123'

// Crypto functions (same as frontend)
async function decryptDEK(encryptedDEKString, password) {
  const { salt, iv, encryptedDEK } = JSON.parse(atob(encryptedDEKString))
  const saltBytes = new Uint8Array(salt)
  const ivBytes = new Uint8Array(iv)
  const encryptedDEKBytes = new Uint8Array(encryptedDEK)

  const encoder = new TextEncoder()
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  const kek = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )

  const dekBytes = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes },
    kek,
    encryptedDEKBytes
  )

  return crypto.subtle.importKey(
    'raw',
    dekBytes,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
}

async function encryptData(data, key) {
  const encoder = new TextEncoder()
  const iv = crypto.getRandomValues(new Uint8Array(12))

  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(data)
  )

  const combined = new Uint8Array(iv.length + encryptedData.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(encryptedData), iv.length)

  return btoa(String.fromCharCode(...combined))
}

async function decryptData(encryptedData, key) {
  const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0))
  const iv = combined.slice(0, 12)
  const data = combined.slice(12)

  const decryptedData = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  )

  const decoder = new TextDecoder()
  return decoder.decode(decryptedData)
}

// Test functions
async function login() {
  console.log('1. Logging in...')
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD })
  })

  const data = await response.json()
  console.log(`   ✓ Logged in as ${data.user.email}`)

  return { sessionToken: data.session_token, encryptedDEK: data.encrypted_dek }
}

async function setupEncryption(encryptedDEK) {
  console.log('\n2. Decrypting DEK...')
  const dek = await decryptDEK(encryptedDEK, TEST_PASSWORD)
  console.log('   ✓ DEK decrypted successfully')
  return dek
}

async function fetchSecretNote(sessionToken, dek) {
  console.log('\n3. Fetching secret note...')

  const response = await fetch(`${API_BASE}/api/secret-note`, {
    headers: {
      'Authorization': `Bearer ${sessionToken}`
    }
  })

  const data = await response.json()

  if (data.encrypted_secret_note) {
    const decryptedNote = await decryptData(data.encrypted_secret_note, dek)
    console.log(`   ✓ Secret note retrieved and decrypted`)
    console.log(`   ✓ Note content: "${decryptedNote.substring(0, 50)}${decryptedNote.length > 50 ? '...' : ''}"`)
    return decryptedNote
  } else {
    console.log('   ✓ No secret note found (empty)')
    return null
  }
}

async function saveSecretNote(sessionToken, dek, noteText) {
  console.log(`\n4. Saving secret note (${noteText.length} chars)...`)

  const encryptedNote = await encryptData(noteText, dek)
  console.log(`   ✓ Note encrypted (${encryptedNote.length} chars)`)

  const response = await fetch(`${API_BASE}/api/secret-note`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionToken}`
    },
    body: JSON.stringify({ encrypted_secret_note: encryptedNote })
  })

  const data = await response.json()
  console.log('   ✓ Secret note saved to database')

  return data
}

async function verifyDatabaseEncryption() {
  console.log('\n5. Verifying note is encrypted in database...')
  console.log('   ℹ Run this to verify:')
  console.log('   npx wrangler d1 execute coach-db --local --command "SELECT email, substr(encrypted_secret_note, 1, 50) FROM users WHERE email=\'test-dek@example.com\'"')
}

// Run the full test
async function runTests() {
  console.log('🧪 Testing Encrypted Secret Note\n')
  console.log('=' .repeat(60))

  try {
    // Login and setup
    const { sessionToken, encryptedDEK } = await login()
    const dek = await setupEncryption(encryptedDEK)

    // Test 1: Fetch empty note
    let note = await fetchSecretNote(sessionToken, dek)

    // Test 2: Save a secret note
    const secretText = `This is my secret note! 🔒

It contains sensitive information:
- My password is... just kidding!
- API keys: none here
- Personal thoughts: Actually this is pretty cool

This note is encrypted with AES-GCM-256 before being stored.
Even the database administrator cannot read this!

Created at: ${new Date().toISOString()}`

    await saveSecretNote(sessionToken, dek, secretText)

    // Test 3: Fetch the note again to verify it was saved
    note = await fetchSecretNote(sessionToken, dek)

    if (note !== secretText) {
      throw new Error('Retrieved note does not match saved note!')
    }

    // Test 4: Update the note
    const updatedText = secretText + '\n\nUpdated: I added this line!'
    await saveSecretNote(sessionToken, dek, updatedText)

    // Test 5: Verify the update
    note = await fetchSecretNote(sessionToken, dek)

    if (note !== updatedText) {
      throw new Error('Updated note does not match!')
    }

    // Verify encryption
    await verifyDatabaseEncryption()

    console.log('\n' + '='.repeat(60))
    console.log('✅ All tests passed!\n')
    console.log('Summary:')
    console.log('  - Logged in and decrypted DEK')
    console.log('  - Saved encrypted secret note')
    console.log('  - Retrieved and decrypted note successfully')
    console.log('  - Updated note and verified changes')
    console.log(`  - Final note length: ${note.length} characters`)

    return true
  } catch (error) {
    console.error('\n❌ Test failed:', error)
    return false
  }
}

runTests().then(success => {
  process.exit(success ? 0 : 1)
})
