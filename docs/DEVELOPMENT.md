# Development Guide

This guide covers how to develop and test the Coach application locally.

## Prerequisites

- Node.js 18+
- npm or pnpm
- Cloudflare account (for deployment)

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:5173 in your browser
```

## Development Workflow

### Running the App

```bash
# Standard Vite dev server (frontend only)
npm run dev

# With Cloudflare Pages dev environment (includes D1 and Functions)
npm run pages:dev
```

### Testing

#### Browser Console Verification

The app includes a headless browser test to verify console logs are working:

```bash
# Make sure dev server is running first
npm run dev

# In another terminal, run the test
npm run test:browser
```

This will:
- Launch a headless Chromium browser
- Navigate to http://localhost:5173
- Capture and display console logs
- Verify expected log messages are present
- Report any errors

Example output:
```
🧪 Starting headless browser test...
🌐 Navigating to http://localhost:5173...
  📝 Console log: 🚀 Coach App initialized - ready for development!
  📝 Console log: Environment: development
  📝 Console log: Timestamp: 2025-10-25T17:58:41.184Z
✅ Browser test complete!
📊 Verification Results:
  ✓ Init message: ✅
  ✓ Environment: ✅
  ✓ Timestamp: ✅
  ✓ Total console messages: 11
  ✓ Errors: 0
✅ All checks passed! Console logging is working correctly.
```

### Code Quality

```bash
# Type checking
npm run lint

# Build for production
npm run build
```

## Development Features

### Hot Module Replacement (HMR)

Vite provides instant HMR - changes to your code will be reflected in the browser immediately without a full page reload.

### React DevTools

Install the React DevTools browser extension for enhanced debugging:
- [Chrome](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)
- [Firefox](https://addons.mozilla.org/en-US/firefox/addon/react-devtools/)

### Console Logging

The app includes debug console logs in development mode. Look for:
- `🚀 Coach App initialized` - App startup
- `Environment: development` - Current environment
- `Timestamp: ...` - App initialization time

### Browser DevTools

Press F12 (or Cmd+Option+I on Mac) to open browser DevTools:
- **Console**: View logs, errors, and warnings
- **Network**: Inspect API calls
- **Application**: View localStorage (user data, theme, etc.)
- **Sources**: Debug with breakpoints

## Project Structure

```
coach/
├── src/
│   ├── components/       # React components
│   │   └── ui/          # shadcn/ui components
│   ├── contexts/        # React contexts (Auth, Theme)
│   ├── lib/            # Utilities (crypto, utils)
│   ├── pages/          # Page components
│   ├── App.tsx         # Root component
│   ├── main.tsx        # Entry point
│   └── index.css       # Global styles
├── functions/          # Cloudflare Pages Functions (API)
├── scripts/           # Utility scripts
│   ├── verify-console.mjs  # Browser console verification
│   └── README.md          # Scripts documentation
├── migrations/        # Database migrations
└── public/           # Static assets
```

## Environment Variables

Create a `.dev.vars` file for local development secrets:

```bash
# .dev.vars (not committed to git)
# Add any Cloudflare-specific secrets here
```

## Tips for Claude Code

When developing with Claude Code:

1. **Run dev server in background**: Claude Code can start `npm run dev` in background mode
2. **Watch console logs**: Use `npm run test:browser` to verify console output
3. **Check server logs**: The background process captures Vite server logs
4. **Hot reload**: Changes are reflected instantly via HMR

Example workflow:
```bash
# Start dev server in background
npm run dev &

# Make changes to code
# ...

# Verify console logs
npm run test:browser

# View at http://localhost:5173
```

## Troubleshooting

### Port Already in Use

If port 5173 is already in use:
```bash
# Find and kill the process
lsof -ti:5173 | xargs kill -9
```

### Build Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite
```

### Type Errors

```bash
# Run type checking
npm run lint

# Check specific file
npx tsc --noEmit src/path/to/file.tsx
```

## Next Steps

- See [README.md](../README.md) for deployment instructions
- See [scripts/README.md](../scripts/README.md) for database management
- See [Cloudflare Pages docs](https://developers.cloudflare.com/pages/) for advanced deployment options
