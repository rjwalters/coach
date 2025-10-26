#!/usr/bin/env node

/**
 * Test script to verify DEK encryption/decryption cycle
 * This simulates what happens during registration and login
 */

// Simulate the backend crypto functions
async function generateDEK() {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
}

async function deriveKEK(password, salt) {
  const encoder = new TextEncoder()
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

async function encryptDEK(dek, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const kek = await deriveKEK(password, salt)
  const dekBytes = await crypto.subtle.exportKey('raw', dek)
  const iv = crypto.getRandomValues(new Uint8Array(12))

  const encryptedDEK = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    kek,
    dekBytes
  )

  const result = {
    salt: Array.from(salt),
    iv: Array.from(iv),
    encryptedDEK: Array.from(new Uint8Array(encryptedDEK))
  }

  return btoa(JSON.stringify(result))
}

async function decryptDEK(encryptedDEKString, password) {
  const { salt, iv, encryptedDEK } = JSON.parse(atob(encryptedDEKString))

  const saltBytes = new Uint8Array(salt)
  const ivBytes = new Uint8Array(iv)
  const encryptedDEKBytes = new Uint8Array(encryptedDEK)

  const kek = await deriveKEK(password, saltBytes)

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

// Helper to compare crypto keys
async function keysAreEqual(key1, key2) {
  const exported1 = await crypto.subtle.exportKey('raw', key1)
  const exported2 = await crypto.subtle.exportKey('raw', key2)

  const arr1 = new Uint8Array(exported1)
  const arr2 = new Uint8Array(exported2)

  if (arr1.length !== arr2.length) return false

  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) return false
  }

  return true
}

// Run the test
async function runTest() {
  console.log('🧪 Testing DEK Encryption/Decryption Cycle\n')

  const password = 'TestPassword123'

  console.log('1. Generating DEK...')
  const originalDEK = await generateDEK()
  console.log('   ✓ DEK generated')

  console.log('\n2. Encrypting DEK with password...')
  const encryptedDEK = await encryptDEK(originalDEK, password)
  console.log(`   ✓ Encrypted DEK length: ${encryptedDEK.length} chars`)

  console.log('\n3. Decrypting DEK with password...')
  const decryptedDEK = await decryptDEK(encryptedDEK, password)
  console.log('   ✓ DEK decrypted')

  console.log('\n4. Verifying keys match...')
  const match = await keysAreEqual(originalDEK, decryptedDEK)

  if (match) {
    console.log('   ✅ SUCCESS: Original and decrypted DEKs match!\n')
    return true
  } else {
    console.log('   ❌ FAIL: Keys do not match\n')
    return false
  }
}

// Test with actual encrypted DEK from database
async function testRealDEK() {
  console.log('🔐 Testing Real DEK from Database\n')

  const realEncryptedDEK = 'eyJzYWx0IjpbMTc5LDE2MywyMTksMTQ4LDE5OCwxNzgsNjgsNjYsNiw2MCwxNzMsMCwxMzAsMjQwLDI0Miw1Ml0sIml2IjpbMTIzLDk2LDE2MCwxMjAsMjEsMjE5LDIsODYsODYsNDgsMTE5LDg2XSwiZW5jcnlwdGVkREVLIjpbNjYsMTI0LDEzNywxMDYsMjQwLDQ3LDIwMSwyMjMsMTQyLDE0NCw4OCwyOCwxODMsMjAyLDEwOCwyMzksMzQsMjI4LDYsNjUsMTczLDM0LDUxLDIzMSwxMTIsMjA1LDc4LDE2NywxLDIzNSwxODMsMjA1LDIwNSwxOTQsMTQwLDIwMSw3LDg4LDI1NSw3LDExNCwxMSwxODgsMjEzLDE3NSwyNDgsMjUxLDE3Ml19'
  const password = 'TestPassword123'

  try {
    console.log('1. Decrypting real DEK from database...')
    const dek = await decryptDEK(realEncryptedDEK, password)
    console.log('   ✓ Decryption successful')

    console.log('\n2. Verifying DEK can be used for encryption...')
    const testData = 'Hello, encrypted world!'
    const encoder = new TextEncoder()
    const iv = crypto.getRandomValues(new Uint8Array(12))

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      dek,
      encoder.encode(testData)
    )

    console.log('   ✓ Test data encrypted successfully')

    console.log('\n3. Verifying DEK can decrypt...')
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      dek,
      encrypted
    )

    const decoder = new TextDecoder()
    const decryptedText = decoder.decode(decrypted)

    if (decryptedText === testData) {
      console.log('   ✅ SUCCESS: DEK can encrypt and decrypt data!\n')
      return true
    } else {
      console.log('   ❌ FAIL: Decrypted text does not match\n')
      return false
    }
  } catch (error) {
    console.log(`   ❌ FAIL: ${error.message}\n`)
    return false
  }
}

// Run both tests
async function main() {
  const test1 = await runTest()
  const test2 = await testRealDEK()

  if (test1 && test2) {
    console.log('✅ All tests passed!')
    process.exit(0)
  } else {
    console.log('❌ Some tests failed')
    process.exit(1)
  }
}

main().catch(error => {
  console.error('Test failed with error:', error)
  process.exit(1)
})
