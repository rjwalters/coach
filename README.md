# Coach - Your AI Personal Coach

An AI-powered personal coach and todo management app built on Cloudflare Pages with end-to-end encryption.

## Features

- **🔐 End-to-End Encryption**: Two-tier encryption system (DEK/KEK) - all your data is encrypted client-side before being stored
- **✅ Encrypted Todo List**: Full CRUD operations with client-side encryption using AES-GCM-256
- **📝 Encrypted Secret Notes**: Private, encrypted text area for sensitive information
- **🔑 Secure Authentication**: Email/password authentication with bcryptjs hashing and session management
- **💾 Session Persistence**: Stay logged in across browser refreshes with secure session tokens
- **🧪 Comprehensive Testing**: Unit tests, API tests, and end-to-end Playwright tests
- **🎨 Dark Mode**: Beautiful UI with dark mode support
- **☁️ Cloudflare Infrastructure**: Fast, reliable, and globally distributed
- **🔒 Zero-Knowledge Architecture**: Server cannot decrypt your data

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **Backend**: Cloudflare Pages + Workers
- **Database**: Cloudflare D1 (SQLite)
- **Encryption**: Web Crypto API with AES-GCM

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- Cloudflare account (for deployment)
- Wrangler CLI (`npm install -g wrangler`)

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

### Database Setup

1. Login to Cloudflare (first time only):
```bash
npm run wrangler:login
```

2. Create a D1 database:
```bash
npm run db:create
```

3. Update the `database_id` in `wrangler.toml` with the ID from the previous command

4. Initialize the database schema:
```bash
# For local development
npm run db:migrate:local

# For remote/production
npm run db:migrate:remote
```

### Local Development

**For development with API and database:**

```bash
# 1. Build the app first
npm run build

# 2. Run with Cloudflare Pages dev (includes D1 and Functions)
npx wrangler pages dev ./dist --compatibility-date=2024-01-01 --local --port=8788
```

**For frontend-only development:**

```bash
# Standard Vite dev server (hot reload, no API)
npm run dev
```

### Testing

```bash
# Encryption tests
npm run test:dek          # Test DEK encryption/decryption
npm run test:todos        # Test encrypted todo CRUD operations
npm run test:note         # Test encrypted secret note
npm run test:note:e2e     # End-to-end test with browser automation

# Authentication tests
npm run test:auth         # Test auth flow

# UI tests
npm run test:theme        # Test theme toggle
npm run test:browser      # Browser verification
```

### Database Management

```bash
# Migrate database schema
npm run db:migrate:local      # Local database
npm run db:migrate:remote     # Remote database

# Backup database
npm run db:backup:local       # Backup local database
npm run db:backup:remote      # Backup remote database

# View database contents
npm run db:console:local      # View local data
npm run db:console:remote     # View remote data

# Check Wrangler status
npm run wrangler:whoami       # Check logged in account
```

### Deployment

```bash
# Deploy to Cloudflare Pages
npm run pages:deploy          # Deploy to preview

# Full deployment (build + migrate + deploy)
npm run deploy                # Builds, migrates remote DB, and deploys to production
```

## Security

### Current Implementation ✅
- **End-to-End Encryption**: Two-tier encryption system (DEK/KEK)
  - Data Encryption Key (DEK) randomly generated per user (256-bit AES)
  - Key Encryption Key (KEK) derived from user password (PBKDF2, 100k iterations)
  - DEK encrypted with KEK and stored in database
  - Allows password changes without re-encrypting all data
  - All todo and note data encrypted client-side before transmission
- **Authentication**: Email/password with bcryptjs hashing (10 rounds)
- **Sessions**: 30-day session tokens stored in localStorage
- **Database**: Cloudflare D1 with encrypted data blobs
- **Zero-Knowledge**: Server cannot decrypt user data without password
- **Email Verification**: Auto-verified (email verification coming in future phase)

### Security Guarantees
- ✅ **Client-side encryption**: Data encrypted in browser before sending to server
- ✅ **Zero-knowledge architecture**: Server stores only encrypted blobs
- ✅ **No plaintext storage**: Database contains no readable user data
- ✅ **Password never transmitted**: Only used locally to derive encryption keys
- ✅ **Session-based protection**: All API endpoints require valid session tokens
- ✅ **Comprehensive testing**: E2E tests verify encryption end-to-end

### Planned (Future Phases)
- **Email Verification**: Required for account activation
- **Password Reset**: Secure password reset with DEK re-encryption
- **OAuth**: Google OAuth integration
- **Two-Factor Authentication**: Additional security layer

## Project Structure

```
coach/
├── src/
│   ├── components/      # React components
│   ├── contexts/        # React contexts (Auth, Theme)
│   ├── lib/            # Utility functions and schemas
│   │   └── schemas/    # Zod validation schemas
│   ├── pages/          # Page components (Login, Dashboard)
│   ├── App.tsx         # Main app component with routing
│   └── main.tsx        # App entry point
├── functions/          # Cloudflare Pages Functions (API routes)
│   ├── api/
│   │   ├── auth/       # Authentication endpoints
│   │   │   ├── register.ts # User registration with DEK generation
│   │   │   ├── login.ts    # User login with DEK return
│   │   │   ├── logout.ts   # User logout
│   │   │   └── me.ts       # Get current user
│   │   ├── todos.ts    # Encrypted todo CRUD endpoints
│   │   └── secret-note.ts # Encrypted secret note endpoints
│   ├── lib/            # Shared backend utilities
│   │   ├── crypto.ts   # Backend crypto functions (DEK/KEK)
│   │   └── schemas.ts  # Backend Zod schemas
│   └── _middleware.ts  # CORS middleware
├── scripts/            # Development and testing scripts
│   ├── test-auth-flow.mjs       # Playwright auth tests
│   ├── test-dek-encryption.mjs  # DEK encryption tests
│   ├── test-encrypted-todos.mjs # Todo CRUD tests
│   ├── test-secret-note.mjs     # Secret note tests
│   ├── test-secret-note-e2e.mjs # E2E browser test
│   ├── test-theme-toggle.mjs    # Theme testing
│   └── verify-console.mjs       # Console log tests
├── docs/               # Documentation
│   ├── AUTH_ARCHITECTURE.md  # Auth system design
│   └── DEVELOPMENT.md        # Development guide
├── migrations/         # Database migrations
├── public/             # Static assets
├── schema.sql          # D1 database schema
├── wrangler.toml       # Cloudflare configuration
└── WORKPLAN.md         # Development roadmap and progress
```

## Development Status

### ✅ Phase 1 Complete - Authentication
- [x] Email/password registration and login
- [x] Session token management (30-day sessions)
- [x] Session persistence across reloads
- [x] Protected routes
- [x] Automated Playwright testing
- [x] Database migration and setup
- [x] Biome linting/formatting

### ✅ Phase 2 Complete - End-to-End Encryption
- [x] Two-tier encryption system (DEK/KEK)
- [x] Client-side encryption utilities
- [x] DEK generation on registration
- [x] DEK decryption on login
- [x] Encrypted todo list with full CRUD
- [x] Encrypted secret note feature
- [x] Comprehensive test suite (unit, API, E2E)
- [x] Database encryption verification

### 📋 Upcoming Features
- [ ] AI coaching integration with Cloudflare AI
- [ ] Interview mode for task creation
- [ ] Email verification
- [ ] Password reset with DEK re-encryption
- [ ] Google OAuth
- [ ] Progress tracking and analytics
- [ ] Mobile app
- [ ] Task sharing and collaboration (with encryption)

See [WORKPLAN.md](./WORKPLAN.md) for detailed roadmap and progress tracking.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
