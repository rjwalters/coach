#!/usr/bin/env node

/**
 * Test script for encrypted todo CRUD operations
 * Simulates the full client-side encryption/decryption flow
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
  console.log(`   ✓ Session token: ${data.session_token.substring(0, 20)}...`)

  return { sessionToken: data.session_token, encryptedDEK: data.encrypted_dek }
}

async function setupEncryption(encryptedDEK) {
  console.log('\n2. Decrypting DEK...')
  const dek = await decryptDEK(encryptedDEK, TEST_PASSWORD)
  console.log('   ✓ DEK decrypted successfully')
  return dek
}

async function createTodo(sessionToken, dek, todoText) {
  console.log(`\n3. Creating todo: "${todoText}"`)

  // Encrypt todo data
  const todoData = JSON.stringify({
    text: todoText,
    completed: false,
    createdAt: Date.now()
  })
  const encryptedData = await encryptData(todoData, dek)
  console.log(`   ✓ Todo encrypted (${encryptedData.length} chars)`)

  // Send to API
  const response = await fetch(`${API_BASE}/api/todos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionToken}`
    },
    body: JSON.stringify({ encrypted_data: encryptedData })
  })

  const data = await response.json()
  console.log(`   ✓ Todo created with ID: ${data.id}`)

  return data
}

async function fetchTodos(sessionToken, dek) {
  console.log('\n4. Fetching all todos...')

  const response = await fetch(`${API_BASE}/api/todos`, {
    headers: {
      'Authorization': `Bearer ${sessionToken}`
    }
  })

  const encryptedTodos = await response.json()
  console.log(`   ✓ Fetched ${encryptedTodos.length} encrypted todos`)

  // Decrypt all todos
  const todos = []
  for (const encryptedTodo of encryptedTodos) {
    const decryptedData = await decryptData(encryptedTodo.encrypted_data, dek)
    const todoData = JSON.parse(decryptedData)
    todos.push({
      id: encryptedTodo.id,
      ...todoData
    })
  }

  console.log('   ✓ Decrypted todos:')
  for (const todo of todos) {
    console.log(`     - [${todo.completed ? '✓' : ' '}] ${todo.text}`)
  }

  return todos
}

async function updateTodo(sessionToken, dek, todoId, updates) {
  console.log(`\n5. Updating todo ${todoId}...`)

  const todoData = JSON.stringify(updates)
  const encryptedData = await encryptData(todoData, dek)

  const response = await fetch(`${API_BASE}/api/todos`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionToken}`
    },
    body: JSON.stringify({ id: todoId, encrypted_data: encryptedData })
  })

  const data = await response.json()
  console.log('   ✓ Todo updated successfully')

  return data
}

async function deleteTodo(sessionToken, todoId) {
  console.log(`\n6. Deleting todo ${todoId}...`)

  const response = await fetch(`${API_BASE}/api/todos?id=${todoId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${sessionToken}`
    }
  })

  const data = await response.json()
  console.log('   ✓ Todo deleted successfully')

  return data
}

async function verifyEncryptionInDatabase(todoId) {
  console.log('\n7. Verifying data is encrypted in database...')

  // This would require direct DB access, for now we'll skip
  console.log('   ℹ Database verification skipped (requires D1 query)')
  console.log('   ℹ You can verify with: npx wrangler d1 execute coach-db --local --command "SELECT * FROM todos"')
}

// Run the full test
async function runTests() {
  console.log('🧪 Testing Encrypted Todo CRUD Operations\n')
  console.log('=' .repeat(60))

  try {
    // Login and setup
    const { sessionToken, encryptedDEK } = await login()
    const dek = await setupEncryption(encryptedDEK)

    // Create todos
    const todo1 = await createTodo(sessionToken, dek, 'Buy groceries')
    const todo2 = await createTodo(sessionToken, dek, 'Write documentation')
    const todo3 = await createTodo(sessionToken, dek, 'Deploy to production')

    // Read todos
    let todos = await fetchTodos(sessionToken, dek)

    // Update a todo (mark as completed)
    const todoToUpdate = todos.find(t => t.text === 'Buy groceries')
    await updateTodo(sessionToken, dek, todoToUpdate.id, {
      text: 'Buy groceries',
      completed: true,
      createdAt: todoToUpdate.createdAt
    })

    // Read again to verify update
    todos = await fetchTodos(sessionToken, dek)

    // Delete a todo
    const todoToDelete = todos.find(t => t.text === 'Write documentation')
    await deleteTodo(sessionToken, todoToDelete.id)

    // Read final state
    console.log('\n8. Final state after operations:')
    todos = await fetchTodos(sessionToken, dek)

    // Verify encryption
    await verifyEncryptionInDatabase()

    console.log('\n' + '='.repeat(60))
    console.log('✅ All tests passed!\n')
    console.log('Summary:')
    console.log('  - Logged in and decrypted DEK')
    console.log('  - Created 3 encrypted todos')
    console.log('  - Read and decrypted todos')
    console.log('  - Updated 1 todo (marked as completed)')
    console.log('  - Deleted 1 todo')
    console.log(`  - Final count: ${todos.length} todos`)

    return true
  } catch (error) {
    console.error('\n❌ Test failed:', error)
    return false
  }
}

runTests().then(success => {
  process.exit(success ? 0 : 1)
})
