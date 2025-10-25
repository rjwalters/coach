# Coach Development Workplan

## Current Status

### ✅ Completed (Phase 1)

**Infrastructure & Tooling**
- [x] Project setup with Vite + React + TypeScript + Tailwind
- [x] Cloudflare Pages + D1 database configuration
- [x] Biome for linting/formatting
- [x] Playwright for headless browser testing
- [x] Git repository and GitHub integration
- [x] Comprehensive documentation (README, DEVELOPMENT, AUTH_ARCHITECTURE)

**Authentication System (Email/Password - No Verification)**
- [x] Updated D1 schema with users, session_tokens, verification_tokens, reset_tokens
- [x] Zod schemas for type-safe validation (frontend + backend)
- [x] bcryptjs for password hashing
- [x] API endpoints: register, login, logout, me
- [x] CORS middleware for API routes
- [x] Auto-verify emails (Phase 1 simplification)

**UI/UX**
- [x] Dark mode implementation with theme toggle
- [x] Login/Registration page (passphrase-based, needs update)
- [x] Dashboard layout with protected routes
- [x] shadcn/ui component library setup
- [x] Theme persistence in localStorage

**Testing**
- [x] Automated browser testing with Playwright
- [x] Console log verification script
- [x] Theme toggle testing script
- [x] Development server background testing

**Database Scripts**
- [x] Migration scripts (local/remote)
- [x] Backup scripts with timestamps
- [x] Database console viewing
- [x] One-command deployment

---

## 🎯 Next Immediate Steps

### 1. Complete Frontend Auth Integration ✅ COMPLETED

**Update AuthContext** (`src/contexts/AuthContext.tsx`)
- [x] Replace passphrase-based auth with email/password
- [x] Use new API endpoints: `/api/auth/register`, `/api/auth/login`
- [x] Store session token in localStorage
- [x] Add session validation on app load
- [x] Remove old passphrase derivation logic
- [x] Update encryption key management (placeholder for now)

**Update LoginPage UI** (`src/pages/LoginPage.tsx`)
- [x] Change from passphrase input to email + password fields
- [x] Update registration flow
- [x] Better error messaging from API
- [x] Loading states during API calls
- [x] Success feedback after registration

**Testing**
- [x] Create Playwright test for registration flow (scripts/test-auth-flow.mjs)
- [ ] Test in production build mode (requires build + pages dev setup)
- [ ] Test session persistence across page reload
- [ ] Test invalid email/password handling

**Actual Time:** 2 hours

---

### 2. Database Setup & Migration ✅ COMPLETED

**Local Development**
- [x] Create D1 database (`npx wrangler d1 create coach-db`)
- [x] Update wrangler.toml with database_id (48720055-9d6f-4df0-9b4d-ff87fa03fbb3)
- [x] Run `npm run db:migrate:local` to create tables
- [x] Verify tables created (users, session_tokens, todos, etc.)

**Remote Setup (When Ready)**
- [ ] Create production D1 database
- [ ] Run `npm run db:migrate:remote`
- [ ] Test in production environment

**Actual Time:** 30 minutes

---

### 3. Encryption Key Management (CRITICAL)

**Current Issue:**
- Old system: Encryption key derived from passphrase
- New system: Need to store encrypted DEK (Data Encryption Key)

**Implementation Plan:**
- [ ] Create utility functions for two-tier encryption
  - `generateDEK()` - Create random 256-bit key
  - `encryptDEK(dek, password)` - Encrypt DEK with password-derived KEK
  - `decryptDEK(encryptedDEK, password)` - Decrypt DEK
- [ ] Update registration to generate and store encrypted DEK
- [ ] Update login to decrypt DEK
- [ ] Update AuthContext to manage DEK in memory
- [ ] Test todo encryption/decryption with new system

**Files to Update:**
- `src/lib/crypto.ts` - Add DEK functions
- `functions/api/auth/register.ts` - Generate DEK on registration
- `functions/api/auth/login.ts` - Return encrypted DEK
- `src/contexts/AuthContext.tsx` - Manage DEK

**Estimated Time:** 3-4 hours

---

### 4. Todo List Integration

**Update Todo API** (`functions/api/todos.ts`)
- [ ] Add session token authentication
- [ ] Verify user owns the todos they're accessing
- [ ] Update to work with new user schema

**Update TodoList Component** (`src/components/TodoList.tsx`)
- [ ] Connect to API endpoints
- [ ] Use encryption key from AuthContext
- [ ] Handle loading states
- [ ] Handle errors
- [ ] Add proper TypeScript types

**Testing**
- [ ] Test creating todos
- [ ] Test reading todos
- [ ] Test updating todos
- [ ] Test deleting todos
- [ ] Verify encryption/decryption works

**Estimated Time:** 2-3 hours

---

## 🚀 Future Phases

### Phase 2: Email Verification (After Phase 1 Complete)

**Email Service Setup**
- [ ] Get Postmark API credentials
- [ ] Set up email package structure (like genstack)
- [ ] Create react-email templates
  - Verification email
  - Welcome email
  - Password reset email
- [ ] Build-time email compilation script

**Verification Flow**
- [ ] Update registration to create verification token
- [ ] Send verification email via Postmark
- [ ] Create verification endpoint
- [ ] Add "resend verification" functionality
- [ ] Block dashboard access until verified
- [ ] Add verification status UI

**Estimated Time:** 4-6 hours

---

### Phase 3: Password Reset

**Implementation**
- [ ] "Forgot password?" link on login page
- [ ] Create password reset request endpoint
- [ ] Send reset email with token
- [ ] Create reset password page
- [ ] Update password with token validation
- [ ] Re-encrypt DEK with new password

**Estimated Time:** 3-4 hours

---

### Phase 4: Google OAuth

**Setup**
- [ ] Register OAuth app with Google
- [ ] Configure Cloudflare OAuth settings
- [ ] Create OAuth flow endpoints
- [ ] Handle OAuth callback
- [ ] Link OAuth to existing accounts

**Implementation**
- [ ] "Sign in with Google" button
- [ ] OAuth redirect flow
- [ ] Account linking UI
- [ ] Handle OAuth-only users (no password)

**Estimated Time:** 4-5 hours

---

### Phase 5: AI Coach Features

**Architecture**
- [ ] Integrate Cloudflare AI Workers
- [ ] Design prompt templates for coaching
- [ ] Create coach API endpoints
- [ ] Implement streaming responses

**Features**
- [ ] Task breakdown assistance
- [ ] Priority suggestions
- [ ] Progress tracking
- [ ] Motivational messages
- [ ] Interview mode for task creation

**Estimated Time:** 8-10 hours

---

### Phase 6: Advanced Features

**Task Management**
- [ ] Task due dates
- [ ] Task priority levels
- [ ] Task categories/tags
- [ ] Task search and filtering
- [ ] Task archiving

**Notifications**
- [ ] Email reminders for tasks
- [ ] Daily/weekly digests
- [ ] Progress reports
- [ ] Achievement notifications

**Collaboration (Future)**
- [ ] Share tasks with others
- [ ] Team workspaces
- [ ] Comments on tasks
- [ ] Activity feed

**Estimated Time:** 15-20 hours

---

## 🐛 Known Issues & Technical Debt

### High Priority
- [ ] Encryption key management (blocking todo functionality)
- [ ] Session token refresh mechanism
- [ ] Rate limiting on auth endpoints
- [ ] HTTPS enforcement in production

### Medium Priority
- [ ] Password strength indicator
- [ ] Better error messages throughout
- [ ] Loading skeleton screens
- [ ] Offline support
- [ ] Browser compatibility testing

### Low Priority
- [ ] Dark mode improvements
- [ ] Mobile responsive design refinement
- [ ] Accessibility audit
- [ ] Performance optimization
- [ ] Bundle size optimization

---

## 📊 Testing Strategy

### Unit Tests (To Add)
- [ ] Crypto utilities
- [ ] Zod schemas
- [ ] API endpoint logic

### Integration Tests (To Add)
- [ ] Auth flow (register → login → logout)
- [ ] Todo CRUD operations
- [ ] Session management
- [ ] Email sending

### E2E Tests (Playwright)
- [x] Browser console logging
- [x] Theme toggle
- [ ] Registration flow
- [ ] Login flow
- [ ] Todo management
- [ ] Full user journey

---

## 🚢 Deployment Checklist

### Pre-Deployment
- [ ] Run all tests
- [ ] Check for TypeScript errors
- [ ] Run Biome linting
- [ ] Test in production-like environment
- [ ] Review database migrations
- [ ] Backup production database

### Deployment Steps
```bash
# 1. Build and test
npm run build
npm run lint

# 2. Migrate database
npm run db:migrate:remote

# 3. Deploy to Cloudflare Pages
npm run pages:deploy:prod

# 4. Verify deployment
# - Test registration
# - Test login
# - Test todo creation
# - Check error logging
```

### Post-Deployment
- [ ] Monitor error logs
- [ ] Check database connections
- [ ] Verify email sending (when enabled)
- [ ] Test critical paths
- [ ] Update documentation

---

## 🎯 Current Status Update (2025-10-25)

### ✅ Phase 1 Authentication - COMPLETED!

All core authentication features are now working:
- ✅ Email/password registration with bcryptjs hashing
- ✅ User login with session token generation
- ✅ Session persistence across page reloads
- ✅ Logout with proper cleanup
- ✅ Protected routes with authentication checks
- ✅ Error handling and validation
- ✅ Automated Playwright testing (`npm run test:auth`)
- ✅ Database successfully migrated and verified

**Test Results:**
- Registration: ✅ Working (redirects to dashboard)
- Login: ✅ Working (creates session token)
- Logout: ✅ Working (deletes session token)
- Session Persistence: ✅ Working (restores user on reload)
- Database: ✅ Users created with email_verified=1

**Known Issues:**
- ⚠️ Logout endpoint had JSON parsing issue - **FIXED** (now reads from Authorization header)
- ⚠️ TypeScript errors (isLoading, userId) - **FIXED**

**Next Priority:**
1. Implement two-tier encryption (DEK/KEK) for todo data encryption
2. Connect TodoList component to API

---

## 📝 Decision Log

### Decided
1. **bcryptjs over Argon2** - Better Cloudflare Workers support
2. **Email auto-verified in Phase 1** - Faster development iteration
3. **Session tokens in localStorage** - Simpler than cookies for SPA
4. **30-day session duration** - Balance between security and UX
5. **Two-tier encryption** - Allows password changes without re-encrypting data
6. **Biome over ESLint** - Faster, better TypeScript support
7. **Zod over other validators** - Best TypeScript integration

### To Decide
1. Should we support passphrase migration for existing users?
2. Email verification: required immediately or grace period?
3. Session token refresh: automatic or require re-login?
4. OAuth: Link to existing accounts or force separate?
5. AI Coach: Which Claude model to use?
6. Pricing model: Free tier limits?

---

## 🎯 Success Metrics

### Phase 1 Complete When:
- [x] User can register with email/password
- [x] User can login and receive session token
- [x] User can logout
- [x] Sessions persist across page reloads
- [x] Proper error handling on all auth endpoints
- [ ] Todo encryption/decryption working with new auth
- [ ] All Playwright tests passing

### Production Ready When:
- [ ] Email verification required
- [ ] Password reset functional
- [ ] Rate limiting implemented
- [ ] HTTPS enforced
- [ ] Database backups automated
- [ ] Error monitoring setup
- [ ] Load testing completed
- [ ] Security audit passed

---

## 📚 Resources & References

### Documentation
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/functions/)
- [Zod Documentation](https://zod.dev/)
- [React Email](https://react.email/)
- [Postmark API](https://postmarkapp.com/developer)

### Internal Docs
- `docs/AUTH_ARCHITECTURE.md` - Full auth system design
- `docs/DEVELOPMENT.md` - Development guide
- `README.md` - Project overview
- `scripts/README.md` - Database scripts

### Genstack Reference
- `/Users/rwalters/GitHub/genstack/packages/email` - Email implementation pattern

---

## 🔄 Last Updated
2025-10-25

## 👤 Maintainer
rjwalters

---

## Notes
- This workplan is a living document
- Update as features are completed
- Add new items as requirements emerge
- Review and adjust priorities weekly
