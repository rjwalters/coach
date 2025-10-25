# Authentication Architecture

## Overview

This document outlines the transition from passphrase-only authentication to a comprehensive email/password + OAuth system with email verification.

## Current System (Passphrase-Only)

### How It Works
- Users enter a passphrase
- User ID is derived deterministically from passphrase (PBKDF2)
- Encryption key is also derived from passphrase
- No email, no username - just passphrase
- User can "login" from any device with same passphrase

### Limitations
- No password recovery
- No email communication
- No OAuth support
- Weak security model

## Proposed System (Email/Password + OAuth)

### Authentication Methods

1. **Email + Password** (Primary)
   - Traditional email/password registration
   - Email verification required
   - Password reset via email

2. **Google OAuth** (Future)
   - Sign in with Google
   - No password needed
   - Email auto-verified

### User Registration Flow

```
1. User enters email + password
2. Hash password with bcrypt/argon2
3. Generate verification token (UUID)
4. Store user in D1 with email_verified=false
5. Send verification email via Postmark
6. User clicks link → verify email
7. Set email_verified=true
8. User can now login
```

### Database Schema Changes

```sql
-- Updated users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,           -- UUID
  email TEXT UNIQUE NOT NULL,    -- User email
  email_verified INTEGER NOT NULL DEFAULT 0, -- Boolean (0/1)
  password_hash TEXT,            -- bcrypt/argon2 hash (nullable for OAuth users)
  oauth_provider TEXT,           -- 'google' | null
  oauth_id TEXT,                 -- Google user ID (nullable)
  created_at INTEGER NOT NULL,
  last_login INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Email verification tokens
CREATE TABLE email_verification_tokens (
  id TEXT PRIMARY KEY,           -- UUID token
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Password reset tokens
CREATE TABLE password_reset_tokens (
  id TEXT PRIMARY KEY,           -- UUID token
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Session tokens (for persistent login)
CREATE TABLE session_tokens (
  id TEXT PRIMARY KEY,           -- UUID token
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_oauth ON users(oauth_provider, oauth_id);
CREATE INDEX idx_verification_tokens_user ON email_verification_tokens(user_id);
CREATE INDEX idx_reset_tokens_user ON password_reset_tokens(user_id);
CREATE INDEX idx_session_tokens_user ON session_tokens(user_id);
```

### Encryption Key Management

**Current:** Encryption key derived from passphrase
**Problem:** Can't change password without re-encrypting all data

**Solution:** Two-tier encryption
1. **Master Key**: Stored in database, encrypted with user's password
2. **Data Encryption Key (DEK)**: Used to encrypt user's todos

```typescript
// Registration
1. Generate random DEK (256-bit)
2. Derive Key Encryption Key (KEK) from password
3. Encrypt DEK with KEK → store encrypted DEK in database
4. Use DEK to encrypt/decrypt todos

// Login
1. Derive KEK from password
2. Fetch encrypted DEK from database
3. Decrypt DEK with KEK
4. Use DEK for data operations

// Password Change
1. Derive old KEK from old password
2. Decrypt DEK with old KEK
3. Derive new KEK from new password
4. Re-encrypt DEK with new KEK
5. Update database
// No need to re-encrypt todos!
```

### Email Service Architecture

Following genstack's pattern:

```typescript
// packages/email/
├── src/
│   ├── emailService.ts           # Postmark client wrapper
│   ├── emailEnv.ts               # Environment config
│   ├── templates/                # React Email templates
│   │   ├── auth/
│   │   │   ├── VerifyEmail.tsx
│   │   │   ├── WelcomeEmail.tsx
│   │   │   └── PasswordReset.tsx
│   │   └── notifications/
│   │       └── TaskReminder.tsx
│   ├── compiled/                 # Pre-compiled HTML/text
│   │   └── auth/
│   │       ├── verify-email.ts
│   │       ├── welcome-email.ts
│   │       └── password-reset.ts
│   └── index.ts
└── scripts/
    └── compileEmails.ts          # Build-time compilation
```

### API Endpoints

```typescript
// Registration & Verification
POST /api/auth/register
  { email, password } → 201 Created + verification email sent

GET /api/auth/verify-email?token=xxx
  → 200 OK (email verified) or 400 Bad Request

POST /api/auth/resend-verification
  { email } → 200 OK (email sent)

// Login & Logout
POST /api/auth/login
  { email, password } → 200 OK + session token

POST /api/auth/logout
  { session_token } → 200 OK

POST /api/auth/refresh
  { session_token } → 200 OK + new session token

// Password Management
POST /api/auth/request-password-reset
  { email } → 200 OK (email sent)

POST /api/auth/reset-password
  { token, new_password } → 200 OK

POST /api/auth/change-password
  { old_password, new_password } → 200 OK

// OAuth (Future)
GET /api/auth/google
  → Redirect to Google OAuth

GET /api/auth/google/callback
  ?code=xxx → Login + redirect to dashboard

// User Info
GET /api/auth/me
  → { id, email, email_verified, created_at }
```

### Frontend Changes

```typescript
// Update AuthContext
interface AuthContextType {
  isAuthenticated: boolean
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  register: (email: string, password: string) => Promise<boolean>
  logout: () => void
  requestPasswordReset: (email: string) => Promise<boolean>
  resetPassword: (token: string, newPassword: string) => Promise<boolean>
  encryptionKey: CryptoKey | null
}
```

### Migration Strategy

**Phase 1:** Add email/password support (keep passphrase working)
- Add new schema columns
- Add email/password login option
- Existing passphrase users continue working

**Phase 2:** Deprecate passphrase
- Show warning to passphrase users
- Provide migration flow: passphrase → email/password
- Set deadline for migration

**Phase 3:** Remove passphrase support
- Remove passphrase login
- Remove passphrase-based user ID derivation
- Clean up old code

## Environment Variables

```bash
# .dev.vars (local development)
POSTMARK_API_TOKEN=xxxxx
POSTMARK_FROM_EMAIL=noreply@coach.app
APP_URL=http://localhost:5173
APP_NAME=Coach

# wrangler.toml (production)
[vars]
POSTMARK_FROM_EMAIL="noreply@coach.app"
APP_URL="https://coach.app"
APP_NAME="Coach"

# Secrets (set via wrangler)
wrangler secret put POSTMARK_API_TOKEN
```

## Security Considerations

1. **Password Hashing**: Use Argon2id (or bcrypt if Argon2 not available in Cloudflare Workers)
2. **Token Security**: UUIDs for tokens, expire in 24 hours
3. **Rate Limiting**: Limit login attempts, email sends
4. **HTTPS Only**: Enforce HTTPS in production
5. **Secure Cookies**: HttpOnly, Secure, SameSite=Strict for session tokens
6. **Email Verification**: Required before full account access
7. **Password Requirements**: Minimum 8 characters, encourage strong passwords

## Testing Strategy

1. **Unit Tests**: Email templates, password hashing, encryption
2. **Integration Tests**: Registration flow, login flow, password reset
3. **E2E Tests**: Full user journey with Playwright
4. **Email Testing**: Use Postmark sandbox for development

## Implementation Order

1. ✅ Design architecture (this document)
2. ⏳ Set up email package structure
3. ⏳ Create email templates
4. ⏳ Update D1 schema
5. ⏳ Implement password hashing
6. ⏳ Implement registration API
7. ⏳ Implement login API
8. ⏳ Update frontend auth
9. ⏳ Add email verification flow
10. ⏳ Add password reset flow
11. ⏳ Add OAuth (Google)
12. ⏳ Migration strategy for existing users
13. ⏳ Comprehensive testing

## Questions to Resolve

1. Should we use Argon2id or bcrypt for password hashing?
   - Argon2id is more secure but may not be available in Workers
   - bcrypt is widely supported and sufficient

2. Session token storage: cookies vs localStorage?
   - Cookies are more secure (HttpOnly)
   - localStorage is easier for SPA

3. How long should tokens be valid?
   - Verification: 24 hours
   - Password reset: 1 hour
   - Session: 30 days with refresh

4. Should email verification be required immediately?
   - Yes, user can't access dashboard until verified
   - Send reminder emails if not verified after 24h

5. Data encryption: when to decrypt?
   - Decrypt on login (keep in memory)
   - Re-encrypt on logout
   - Never store decrypted DEK

## Next Steps

1. Get Postmark API credentials
2. Set up email package structure
3. Create first email template (verification)
4. Test email sending locally
5. Update D1 schema
6. Begin API implementation
