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

1. Create a D1 database:
```bash
wrangler d1 create coach-db
```

2. Update the `database_id` in `wrangler.toml` with the ID from the previous command

3. Initialize the database schema:
```bash
wrangler d1 execute coach-db --file=./schema.sql
```

### Local Development with Wrangler

```bash
# Run with Cloudflare Pages dev environment
npm run pages:dev
```

### Deployment

```bash
# Build and deploy to Cloudflare Pages
npm run pages:deploy
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
