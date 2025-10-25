// Derive a deterministic user ID from a passphrase
// This allows users to "login" using just their passphrase without storing credentials
export async function deriveUserId(passphrase: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(passphrase)

  // Use a fixed salt for user ID derivation (deterministic)
  const fixedSalt = encoder.encode('coach-user-id-salt-v1')

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    data,
    'PBKDF2',
    false,
    ['deriveBits']
  )

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: fixedSalt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  )

  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(derivedBits))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Derive a cryptographic key from a passphrase using PBKDF2
export async function deriveKey(passphrase: string, salt?: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const passphraseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  )

  // Use provided salt or get from localStorage, or generate new one
  let actualSalt = salt
  if (!actualSalt) {
    const storedSalt = localStorage.getItem('coach_salt')
    if (storedSalt) {
      actualSalt = new Uint8Array(JSON.parse(storedSalt))
    } else {
      actualSalt = crypto.getRandomValues(new Uint8Array(16))
      localStorage.setItem('coach_salt', JSON.stringify(Array.from(actualSalt)))
    }
  }

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: actualSalt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passphraseKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
}

// Encrypt data with AES-GCM
export async function encryptData(data: string, key: CryptoKey): Promise<string> {
  const encoder = new TextEncoder()
  const iv = crypto.getRandomValues(new Uint8Array(12))

  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(data)
  )

  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encryptedData.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(encryptedData), iv.length)

  // Convert to base64
  return btoa(String.fromCharCode(...combined))
}

// Decrypt data with AES-GCM
export async function decryptData(encryptedData: string, key: CryptoKey): Promise<string> {
  // Convert from base64
  const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0))

  // Extract IV and encrypted data
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
