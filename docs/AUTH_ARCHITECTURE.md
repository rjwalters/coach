# Authentication & Encryption Architecture

## Overview

This document outlines the complete authentication and encryption architecture for the Coach app, including email/password authentication, session management, and the two-tier encryption system (DEK/KEK).

---

## Current Implementation ✅

### Authentication System

The Coach app uses **email/password authentication** with **bcryptjs hashing** and **session token management**.

#### User Registration Flow

```
1. User enters email + password
2. Validate email format and password strength (min 8 chars)
3. Hash password with bcryptjs (10 rounds)
4. Generate random DEK (Data Encryption Key) - 256-bit AES
5. Encrypt DEK with password-derived KEK (Key Encryption Key)
6. Generate unique user ID (UUID)
7. Store in database:
   - user_id
   - email
   - password_hash
   - encrypted_dek
   - email_verified=1 (auto-verified in current phase)
8. Automatically log in user (create session token)
9. Redirect to dashboard
```

#### Login Flow

```
1. User enters email + password
2. Look up user by email
3. Verify password hash with bcryptjs.compare()
4. If valid:
   a. Generate session token (UUID, 30-day expiration)
   b. Store session token in database
   c. Return to client:
      - session_token
      - encrypted_dek
      - user info (email, id, etc.)
5. Client side:
   a. Store session_token in localStorage
   b. Derive KEK from password (PBKDF2, 100k iterations)
   c. Decrypt DEK with KEK
   d. Store DEK in memory for session
   e. Store DEK in localStorage for persistence
6. Redirect to dashboard
```

#### Logout Flow

```
1. Client sends session token to /api/auth/logout
2. Server deletes session token from database
3. Client clears:
   - localStorage (session_token, DEK)
   - Memory (AuthContext state)
4. Redirect to login page
```

#### Session Persistence

```
1. On app load, check for session_token in localStorage
2. If found, call /api/auth/me with token
3. If valid:
   a. Restore user info
   b. Restore DEK from localStorage
   c. User stays logged in
4. If invalid/expired:
   a. Clear localStorage
   b. Redirect to login
```

---

## Two-Tier Encryption System (DEK/KEK)

### Architecture

The Coach app uses a **zero-knowledge, two-tier encryption** system where:
- **DEK (Data Encryption Key)**: Random 256-bit AES key used to encrypt user data
- **KEK (Key Encryption Key)**: Derived from user password, used to encrypt the DEK

### Why Two-Tier?

1. **Password Changes**: Can change password by just re-encrypting DEK, not all user data
2. **Performance**: Derive KEK once, use DEK (fast) for all data operations
3. **Security**: Server never has access to DEK in plaintext

### Encryption Flow

#### Registration
```
1. Generate random DEK (256-bit AES)
   crypto.subtle.generateKey('AES-GCM', 256)

2. Generate random salt (16 bytes)

3. Derive KEK from password
   PBKDF2(password, salt, 100k iterations, SHA-256)

4. Encrypt DEK with KEK
   AES-GCM-256(DEK, KEK, random IV)

5. Store in database:
   {
     salt: [16 bytes],
     iv: [12 bytes],
     encryptedDEK: [encrypted DEK bytes]
   }
   (encoded as base64 JSON string)
```

#### Login
```
1. Fetch encrypted_dek from database

2. Decode base64 JSON to get:
   - salt (16 bytes)
   - iv (12 bytes)
   - encryptedDEK (encrypted bytes)

3. Derive KEK from password using stored salt
   PBKDF2(password, salt, 100k iterations, SHA-256)

4. Decrypt DEK with KEK
   AES-GCM-256-decrypt(encryptedDEK, KEK, iv)

5. Import DEK as CryptoKey
   crypto.subtle.importKey('raw', dekBytes, 'AES-GCM')

6. Store DEK in memory and localStorage
```

#### Data Encryption (Todos, Secret Note)
```
1. Get DEK from AuthContext

2. Encrypt data
   a. Generate random IV (12 bytes)
   b. AES-GCM-256(plaintext, DEK, IV)
   c. Combine IV + ciphertext
   d. Encode as base64

3. Send encrypted blob to server

4. Server stores blob as-is (cannot decrypt)
```

#### Data Decryption
```
1. Fetch encrypted blob from server

2. Get DEK from AuthContext

3. Decrypt data
   a. Decode base64
   b. Extract IV (first 12 bytes)
   c. Extract ciphertext (remaining bytes)
   d. AES-GCM-256-decrypt(ciphertext, DEK, IV)
   e. Decode UTF-8 to get plaintext

4. Display plaintext to user
```

---

## Database Schema

```sql
-- Users table with email/password authentication
CREATE TABLE users (
  id TEXT PRIMARY KEY,                    -- UUID
  email TEXT UNIQUE NOT NULL,             -- User email
  email_verified INTEGER NOT NULL DEFAULT 0, -- Boolean (0/1)
  password_hash TEXT,                     -- bcryptjs hash (nullable for OAuth users)
  oauth_provider TEXT,                    -- 'google' | null (future)
  oauth_id TEXT,                          -- OAuth user ID (nullable)
  encrypted_dek TEXT,                     -- Encrypted DEK (base64 JSON)
  encrypted_secret_note TEXT,             -- User's encrypted secret note
  created_at INTEGER NOT NULL,            -- Unix timestamp
  last_login INTEGER NOT NULL,            -- Unix timestamp
  updated_at INTEGER NOT NULL,            -- Unix timestamp
  CHECK (email_verified IN (0, 1)),
  CHECK (oauth_provider IS NULL OR oauth_provider IN ('google')),
  CHECK (password_hash IS NOT NULL OR oauth_provider IS NOT NULL)
);

-- Session tokens for persistent login (30-day expiration)
CREATE TABLE session_tokens (
  id TEXT PRIMARY KEY,                    -- UUID token
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,            -- Unix timestamp
  created_at INTEGER NOT NULL,            -- Unix timestamp
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Email verification tokens (future phase)
CREATE TABLE email_verification_tokens (
  id TEXT PRIMARY KEY,                    -- UUID token
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,            -- Unix timestamp
  used INTEGER NOT NULL DEFAULT 0,        -- Boolean
  created_at INTEGER NOT NULL,            -- Unix timestamp
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (used IN (0, 1))
);

-- Password reset tokens (future phase)
CREATE TABLE password_reset_tokens (
  id TEXT PRIMARY KEY,                    -- UUID token
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,            -- Unix timestamp
  used INTEGER NOT NULL DEFAULT 0,        -- Boolean
  created_at INTEGER NOT NULL,            -- Unix timestamp
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (used IN (0, 1))
);

-- Todos table with encrypted data
CREATE TABLE todos (
  id TEXT PRIMARY KEY,                    -- UUID
  user_id TEXT NOT NULL,
  encrypted_data TEXT NOT NULL,           -- Encrypted todo data (base64)
  created_at INTEGER NOT NULL,            -- Unix timestamp
  updated_at INTEGER NOT NULL,            -- Unix timestamp
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_oauth ON users(oauth_provider, oauth_id);
CREATE INDEX idx_session_tokens_user ON session_tokens(user_id);
CREATE INDEX idx_session_tokens_expires ON session_tokens(expires_at);
CREATE INDEX idx_verification_tokens_user ON email_verification_tokens(user_id);
CREATE INDEX idx_reset_tokens_user ON password_reset_tokens(user_id);
CREATE INDEX idx_todos_user_id ON todos(user_id);
CREATE INDEX idx_todos_created_at ON todos(created_at);
```

---

## API Endpoints

### Authentication

#### `POST /api/auth/register`
- **Input**: `{ email, password }`
- **Process**:
  1. Validate email and password
  2. Check if user exists
  3. Hash password (bcryptjs, 10 rounds)
  4. Generate and encrypt DEK
  5. Create user in database
- **Output**: `{ user, message }`
- **Auto-login**: Yes (calls login endpoint internally)

#### `POST /api/auth/login`
- **Input**: `{ email, password }`
- **Process**:
  1. Look up user by email
  2. Verify password hash
  3. Create session token (30-day expiration)
  4. Update last_login timestamp
- **Output**: `{ user, session_token, encrypted_dek }`

#### `POST /api/auth/logout`
- **Input**: Session token in Authorization header
- **Process**:
  1. Validate session token
  2. Delete session from database
- **Output**: `{ success: true }`

#### `GET /api/auth/me`
- **Input**: Session token in Authorization header
- **Process**:
  1. Validate session token
  2. Check if expired
  3. Return user info
- **Output**: `{ user }`

### Encrypted Data

#### `GET /api/todos`
- **Auth**: Required (session token)
- **Output**: Array of encrypted todos
- **Note**: Server cannot decrypt, returns encrypted blobs

#### `POST /api/todos`
- **Auth**: Required
- **Input**: `{ encrypted_data }`
- **Output**: Created todo (encrypted)

#### `PUT /api/todos`
- **Auth**: Required
- **Input**: `{ id, encrypted_data }`
- **Output**: Updated todo (encrypted)

#### `DELETE /api/todos?id=<id>`
- **Auth**: Required
- **Output**: `{ success: true }`

#### `GET /api/secret-note`
- **Auth**: Required
- **Output**: `{ encrypted_secret_note }`

#### `PUT /api/secret-note`
- **Auth**: Required
- **Input**: `{ encrypted_secret_note }`
- **Output**: `{ success: true }`

---

## Security Guarantees

### What's Protected ✅

1. **Zero-Knowledge Architecture**
   - Server never sees plaintext user data
   - All encryption happens client-side
   - Database admin cannot read todos or notes

2. **Password Security**
   - bcryptjs hashing with 10 rounds
   - Password never transmitted in plaintext
   - Password only used locally to derive KEK

3. **Encryption Security**
   - AES-GCM-256 for all data encryption
   - PBKDF2 with 100k iterations for KEK derivation
   - Random IV for each encryption operation
   - Random salt for each user's KEK derivation

4. **Session Security**
   - 30-day session tokens
   - Stored in localStorage (acceptable for SPA)
   - Can be invalidated server-side
   - Automatic expiration

5. **Data Isolation**
   - Users can only access their own data
   - Session token validates ownership
   - Database foreign keys enforce relationships

### Password Change Flow (Future)

When a user changes their password:
```
1. Verify old password
2. Decrypt DEK with old KEK
3. Derive new KEK from new password
4. Re-encrypt DEK with new KEK
5. Update encrypted_dek in database
```

**Important**: All user data (todos, notes) remain encrypted with the same DEK. Only the DEK's encryption changes. This is why we use two-tier encryption!

---

## Testing

### Unit Tests
- `npm run test:dek` - DEK encryption/decryption cycle

### API Tests
- `npm run test:todos` - Todo CRUD with encryption
- `npm run test:note` - Secret note encryption

### E2E Tests
- `npm run test:note:e2e` - Full browser test
  - Register/login
  - Write encrypted note
  - Verify database encryption
  - Logout
  - Login again
  - Verify decryption

---

## Future Enhancements

### Planned
- **Email Verification**: Require email confirmation before access
- **Password Reset**: Secure password reset with DEK re-encryption
- **OAuth**: Google OAuth integration
- **Two-Factor Authentication**: Additional security layer

### Under Consideration
- **Account Recovery**: Recovery codes for locked accounts
- **Key Rotation**: Periodic DEK rotation for enhanced security
- **Biometric Auth**: Face ID / Touch ID for mobile
- **Hardware Keys**: WebAuthn support for YubiKey, etc.

---

## Comparison with Other Systems

### vs. Standard Authentication (like most apps)
- **Most apps**: Server can read your data
- **Coach**: Server cannot read your data (zero-knowledge)

### vs. Passphrase-Only Systems
- **Passphrase**: Deterministic, no recovery, limited security
- **Coach**: Email/password, recovery possible, better UX

### vs. Other Encrypted Apps (Signal, etc.)
- **Similar**: End-to-end encryption, zero-knowledge
- **Different**: Two-tier allows password changes without data re-encryption

---

## Technical Decisions

### Why bcryptjs instead of Argon2?
- Better support in Cloudflare Workers
- Industry standard, battle-tested
- 10 rounds provides good security/performance balance

### Why localStorage instead of cookies?
- Simpler for SPA architecture
- Easier to manage client-side
- Acceptable security trade-off for this use case

### Why 30-day sessions?
- Balance between security and UX
- Users don't want to login daily
- Can be invalidated if needed

### Why PBKDF2 instead of Argon2 for KEK?
- Available in Web Crypto API (browser native)
- No external dependencies
- 100k iterations provides good security
- Fast enough for UX (1-2 seconds on modern devices)

### Why AES-GCM instead of ChaCha20-Poly1305?
- Available in Web Crypto API (browser native)
- Hardware acceleration on most devices
- Industry standard for web encryption

---

## Last Updated
2025-10-26
