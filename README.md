# Coach - Your AI Personal Coach

An AI-powered personal coach and todo management app built on Cloudflare Pages with end-to-end encryption.

## Features

- **Secure Authentication**: Passphrase-based encryption with local key storage
- **End-to-End Encryption**: All your data is encrypted client-side before being stored
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

```bash
# Standard Vite dev server
npm run dev

# With Cloudflare Pages dev environment (includes D1 and Functions)
npm run pages:dev
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

- All todo data is encrypted client-side using your passphrase
- The passphrase never leaves your device
- Encryption keys are derived using PBKDF2 with 100,000 iterations
- Data is encrypted using AES-GCM with 256-bit keys
- **Important**: If you forget your passphrase, your data cannot be recovered (key recovery coming soon)

## Project Structure

```
coach/
├── src/
│   ├── components/      # React components
│   ├── contexts/        # React contexts (Auth, etc.)
│   ├── lib/            # Utility functions (crypto, etc.)
│   ├── pages/          # Page components
│   ├── App.tsx         # Main app component
│   └── main.tsx        # App entry point
├── functions/          # Cloudflare Pages Functions (API routes)
├── public/             # Static assets
├── schema.sql          # D1 database schema
└── wrangler.toml       # Cloudflare configuration
```

## Roadmap

- [ ] AI coaching integration with Cloudflare AI
- [ ] Interview mode for task creation and prioritization
- [ ] Task completion assistance
- [ ] Progress tracking and analytics
- [ ] Key recovery mechanism
- [ ] Mobile app
- [ ] Task sharing and collaboration

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
