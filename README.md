# Coach - Your AI Personal Coach

An AI-powered personal coach and todo management app built on Cloudflare Pages with end-to-end encryption.

## Features

- **Secure Authentication**: Email/password authentication with bcryptjs hashing and session management
- **End-to-End Encryption**: All your data is encrypted client-side before being stored (in development)
- **Session Persistence**: Stay logged in across browser refreshes with secure session tokens
- **Automated Testing**: Comprehensive Playwright tests for authentication flows
- **AI Coaching**: Get personalized guidance to stay on track (coming soon)
- **Interview Mode**: Interactive sessions to help create and prioritize tasks (coming soon)
- **Cloudflare Infrastructure**: Fast, reliable, and globally distributed

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
# Run authentication flow tests
npm run test:auth

# Run theme toggle tests
npm run test:theme

# Run browser verification tests
npm run test:browser
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

### Current Implementation (Phase 1)
- **Authentication**: Email/password with bcryptjs hashing (10 rounds)
- **Sessions**: 30-day session tokens stored in localStorage
- **Database**: Cloudflare D1 with proper password hashing
- **Email Verification**: Auto-verified in Phase 1 (email verification coming in Phase 2)

### Planned (Phase 2+)
- **End-to-End Encryption**: Two-tier encryption system (DEK/KEK)
  - Data Encryption Key (DEK) randomly generated per user
  - Key Encryption Key (KEK) derived from user password
  - DEK encrypted with KEK and stored in database
  - Allows password changes without re-encrypting all data
- **Email Verification**: Required for account activation
- **Password Reset**: Secure password reset via email
- **OAuth**: Google OAuth integration

**Important**: Currently todo data encryption is not yet implemented. This will be added in the next phase.

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
│   ├── api/auth/       # Authentication endpoints
│   │   ├── register.ts # User registration
│   │   ├── login.ts    # User login
│   │   ├── logout.ts   # User logout
│   │   └── me.ts       # Get current user
│   ├── lib/            # Shared backend utilities
│   │   └── schemas.ts  # Backend Zod schemas
│   └── _middleware.ts  # CORS middleware
├── scripts/            # Development and testing scripts
│   ├── test-auth-flow.mjs    # Playwright auth tests
│   ├── test-theme-toggle.mjs # Theme testing
│   └── verify-console.mjs    # Console log tests
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

### ✅ Phase 1 Complete (Email/Password Auth)
- [x] Email/password registration and login
- [x] Session token management
- [x] Session persistence across reloads
- [x] Protected routes
- [x] Automated Playwright testing
- [x] Database migration and setup
- [x] Biome linting/formatting
- [x] Comprehensive documentation

### 🚧 Current Phase: Two-Tier Encryption
- [ ] Implement DEK/KEK encryption system
- [ ] Connect TodoList to encrypted API
- [ ] Test full CRUD operations with encryption

### 📋 Upcoming Features
- [ ] Email verification (Phase 2)
- [ ] Password reset (Phase 3)
- [ ] Google OAuth (Phase 4)
- [ ] AI coaching integration with Cloudflare AI
- [ ] Interview mode for task creation
- [ ] Progress tracking and analytics
- [ ] Mobile app
- [ ] Task sharing and collaboration

See [WORKPLAN.md](./WORKPLAN.md) for detailed roadmap and progress tracking.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
