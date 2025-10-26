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

### 3. Encryption Key Management (CRITICAL) ✅ COMPLETED

**Implementation:**
- [x] Created utility functions for two-tier encryption
  - `generateDEK()` - Create random 256-bit key
  - `encryptDEK(dek, password)` - Encrypt DEK with password-derived KEK
  - `decryptDEK(encryptedDEK, password)` - Decrypt DEK
- [x] Updated registration to generate and store encrypted DEK
- [x] Updated login to return encrypted DEK
- [x] Updated AuthContext to manage DEK in memory
- [x] Tested todo encryption/decryption with new system

**Files Updated:**
- `src/lib/crypto.ts` - Added DEK functions
- `functions/lib/crypto.ts` - Backend crypto utilities
- `functions/api/auth/register.ts` - Generate DEK on registration
- `functions/api/auth/login.ts` - Return encrypted DEK
- `src/contexts/AuthContext.tsx` - Manage DEK
- `functions/lib/schemas.ts` - Updated login response schema

**Actual Time:** 3 hours

---

### 4. Todo List Integration ✅ COMPLETED

**Updated Todo API** (`functions/api/todos.ts`)
- [x] Added session token authentication
- [x] Verify user owns the todos they're accessing
- [x] Updated to work with new user schema
- [x] Full CRUD endpoints (GET, POST, PUT, DELETE)

**Updated TodoList Component** (`src/components/TodoList.tsx`)
- [x] Connected to API endpoints
- [x] Uses encryption key from AuthContext
- [x] Handles loading states
- [x] Handles errors with rollback
- [x] Added proper TypeScript types
- [x] Optimistic UI updates

**Testing**
- [x] Test creating todos (encrypted client-side)
- [x] Test reading todos (decrypted client-side)
- [x] Test updating todos (re-encrypted)
- [x] Test deleting todos
- [x] Verified encryption/decryption works
- [x] Verified database contains only encrypted blobs

**Actual Time:** 2 hours

---

### 5. Secret Note Feature ✅ COMPLETED

**Added Secret Note** (NEW)
- [x] Database migration: Added `encrypted_secret_note` column to users table
- [x] API endpoints: `GET/PUT /api/secret-note`
- [x] React component: `SecretNote.tsx` with encryption
- [x] Integrated into Dashboard
- [x] Client-side encryption/decryption
- [x] Auto-load on login
- [x] Manual save with timestamp
- [x] Error handling

**Testing**
- [x] API tests (`npm run test:note`)
- [x] E2E browser test (`npm run test:note:e2e`)
- [x] Database encryption verification
- [x] Login/logout/re-login cycle

**Actual Time:** 2 hours

---

## 🚀 Future Phases



### Phase 6: Email Verification

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

### Phase 7: Password Reset

**Implementation**
- [ ] "Forgot password?" link on login page
- [ ] Create password reset request endpoint
- [ ] Send reset email with token
- [ ] Create reset password page
- [ ] Update password with token validation
- [ ] Re-encrypt DEK with new password

**Estimated Time:** 3-4 hours

---

### Phase 8: Google OAuth

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

### Phase 4: Productivity Tracking & Completion Stats

**Goal:** Help users track their progress and see how much work they're getting done over time. Keeps the focus on completion and momentum without adding complexity like due dates or priorities.

**Option A: Simple Completion Stats (RECOMMENDED - 2-3 hours)**

Minimal, focused approach that provides immediate value:

**Features:**
- [ ] Add `completed_at` timestamp column to todos table
- [ ] Track completion timestamp when todo is checked off
- [ ] Create stats component for dashboard
- [ ] Display key metrics:
  - Total todos completed (all time)
  - Completed today
  - Completed this week
  - Current streak (consecutive days with completions)
  - Completion rate (completed vs total created)
- [ ] Optional: AI-powered encouragement based on stats

**Implementation:**
- Database: ALTER TABLE todos ADD COLUMN completed_at INTEGER
- Component: `src/components/ProductivityStats.tsx`
- Queries: Simple aggregation on completed_at timestamps
- UI: Lightweight stats card on dashboard

**Why This First:**
- Quick win (2-3 hours)
- High motivational impact
- No new complexity (no dates, priorities, etc.)
- Fits the "Coach" theme (coaches track your progress)
- Foundation for future insights

**Option B: Completion History (Medium - 4-5 hours)**

Everything from Option A, plus:
- [ ] List of recently completed todos
- [ ] "On this day" feature (historical completions)
- [ ] Weekly/monthly rollup views
- [ ] Text-based history view
- [ ] Export completion history

**Option C: Productivity Insights (Advanced - 6-8 hours)**

Everything from Options A+B, plus:
- [ ] AI-powered insights ("You complete 3x more on Tuesdays")
- [ ] Trend analysis and charts
- [ ] Productivity patterns detection
- [ ] Suggestions for improvement
- [ ] Best/worst days identification

**Estimated Time:**
- Option A: 2-3 hours
- Option B: 4-5 hours
- Option C: 6-8 hours

---

### Phase 5: Additional AI Coach Features

**Partially Completed:**
- [x] Interview mode for task creation ✅
- [x] Task breakdown assistance (via clarifying questions) ✅
- [x] Integrate Cloudflare AI Workers ✅
- [x] Design prompt templates for coaching ✅
- [x] Create coach API endpoints ✅

**Future Features:**
- [ ] Streaming AI responses (for longer conversations)
- [ ] Priority suggestions (if user wants them)
- [ ] Motivational messages based on progress
- [ ] Task estimation assistance
- [ ] Daily/weekly planning mode
- [ ] Reflection prompts

**Estimated Time:** 6-8 hours for remaining features

---

### Phase 9: Advanced Features

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

## 🎯 Current Status Update (2025-10-26)

### ✅ Phase 1 Authentication - COMPLETED! (2025-10-25)

All core authentication features are working:
- ✅ Email/password registration with bcryptjs hashing
- ✅ User login with session token generation
- ✅ Session persistence across page reloads
- ✅ Logout with proper cleanup
- ✅ Protected routes with authentication checks
- ✅ Error handling and validation
- ✅ Automated Playwright testing (`npm run test:auth`)
- ✅ Database successfully migrated and verified

### ✅ Phase 2 End-to-End Encryption - COMPLETED! (2025-10-26)

All encryption features are working:
- ✅ Two-tier encryption system (DEK/KEK) implemented
- ✅ DEK generation on user registration
- ✅ DEK encryption with password-derived KEK
- ✅ DEK decryption on login
- ✅ DEK persistence in memory and localStorage
- ✅ Encrypted todo list with full CRUD operations
- ✅ Encrypted secret note feature
- ✅ Client-side encryption utilities (frontend & backend)
- ✅ Comprehensive test suite:
  - Unit tests: DEK encryption/decryption (`npm run test:dek`)
  - API tests: Todo CRUD (`npm run test:todos`)
  - API tests: Secret note (`npm run test:note`)
  - E2E tests: Full user journey (`npm run test:note:e2e`)
- ✅ Database encryption verification (no plaintext storage)

**Test Results:**
- DEK Encryption: ✅ All tests passed
- Todo CRUD: ✅ Created, read, updated, deleted encrypted todos
- Secret Note: ✅ Save, retrieve, update encrypted notes
- E2E Flow: ✅ Login → Write → Logout → Login → Read (all working)
- Database Verification: ✅ Only encrypted blobs stored, no plaintext

**Architecture Highlights:**
- Zero-knowledge: Server cannot decrypt user data
- Password changes won't require re-encrypting all data (just re-encrypt DEK)
- AES-GCM-256 encryption for all user data
- PBKDF2 with 100k iterations for KEK derivation
- Session-based API authentication

### ✅ Phase 3 AI-Assisted Todo Creation - COMPLETED! (2025-10-26)

Core AI coaching features implemented:
- ✅ AI todo assistant endpoint (`/api/ai-todo-assist`)
- ✅ Interview-style clarification for vague inputs
- ✅ Duplicate detection in existing todos
- ✅ Conversation UI with questions and answers
- ✅ Free-form text todos (no structured metadata)
- ✅ Integration with Cloudflare AI (LLaMA 3.1 8B Instruct)
- ✅ AI usage tracking with token counts
- ✅ Graceful fallback when AI unavailable
- ✅ Code refactoring: Created `useAuthenticatedApi` hook
- ✅ Removed proof-of-concept AI joke feature
- ✅ E2E test suite (`npm run test:ai-todo:e2e`)

**Test Results:**
- Clear Todos: ✅ Created directly without AI questions
- Vague Inputs: ✅ AI asks clarifying questions
- Conversation Flow: ✅ Question → Answer → Todo created
- Duplicate Detection: ✅ AI identifies similar todos
- Encryption: ✅ All todos encrypted end-to-end

**Implementation Highlights:**
- Interview-style coaching interaction
- Matches user's text-file workflow (no dates/priorities)
- AI provides helpful guidance without being intrusive
- Clean, conversational UI

**Files Changed:**
- `functions/api/ai-todo-assist.ts` (NEW - 171 lines)
- `src/hooks/useAuthenticatedApi.ts` (NEW - 62 lines)
- `scripts/test-ai-todo-e2e.mjs` (NEW - 316 lines)
- `src/components/TodoList.tsx` (+113 lines)
- `src/components/SecretNote.tsx` (-71 lines)

**Next Priority:**
1. Productivity tracking and completion stats
2. Email verification (Phase 2)
3. Additional AI coach features

---

## 📝 Decision Log

### Decided
1. **bcryptjs over Argon2** - Better Cloudflare Workers support
2. **Email auto-verified in Phase 1** - Faster development iteration
3. **Session tokens in localStorage** - Simpler than cookies for SPA
4. **30-day session duration** - Balance between security and UX
5. **Two-tier encryption (DEK/KEK)** - Allows password changes without re-encrypting data ✅
6. **Biome over ESLint** - Faster, better TypeScript support
7. **Zod over other validators** - Best TypeScript integration
8. **AES-GCM-256** - Industry standard for data encryption
9. **PBKDF2 with 100k iterations** - Good balance of security and performance
10. **Client-side encryption** - Zero-knowledge architecture
11. **Secret note in user table** - One note per user, simpler than separate table
12. **Manual save for secret note** - User has control over when data is synced

### To Decide
1. ~~Should we support passphrase migration for existing users?~~ N/A (never had passphrase system in production)
2. Email verification: required immediately or grace period?
3. Session token refresh: automatic or require re-login?
4. OAuth: Link to existing accounts or force separate?
5. AI Coach: Which Claude model to use? (Likely Claude 3.5 Sonnet)
6. Pricing model: Free tier limits?
7. Todo categories/tags: Encrypted separately or part of todo data?
8. Sharing: How to handle encrypted data sharing between users?

---

## 🎯 Success Metrics

### Phase 1 Complete ✅ (Authentication)
- [x] User can register with email/password
- [x] User can login and receive session token
- [x] User can logout
- [x] Sessions persist across page reloads
- [x] Proper error handling on all auth endpoints
- [x] All Playwright tests passing

### Phase 2 Complete ✅ (Encryption)
- [x] Two-tier encryption (DEK/KEK) implemented
- [x] Todo encryption/decryption working
- [x] Secret note encryption working
- [x] All unit tests passing
- [x] All API tests passing
- [x] All E2E tests passing
- [x] Database verification (no plaintext)
- [x] Zero-knowledge architecture verified

### Phase 3 Complete ✅ (AI-Assisted Todo Creation)
- [x] AI todo assistant endpoint implemented
- [x] Interview-style clarification working
- [x] Duplicate detection functional
- [x] Conversation UI polished
- [x] Free-form todos (no metadata complexity)
- [x] Cloudflare AI integration successful
- [x] All E2E tests passing
- [x] Code quality improved (useAuthenticatedApi hook)

### MVP Ready When:
- [x] Users can register and login ✅
- [x] Users can create encrypted todos ✅
- [x] Users can store encrypted notes ✅
- [x] Users can get AI coaching ✅
- [x] Users can use interview mode ✅
- [ ] Users can track completion stats (Phase 4)

**🎉 MVP ACHIEVED! Core features complete. Next: Productivity tracking for better motivation.**

### Production Ready When:
- [ ] Email verification required
- [ ] Password reset functional
- [ ] Rate limiting implemented
- [ ] HTTPS enforced (Cloudflare handles this)
- [ ] Database backups automated
- [ ] Error monitoring setup (Cloudflare analytics)
- [ ] Load testing completed
- [ ] Security audit passed
- [ ] Privacy policy and terms of service

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
2025-10-26

### Recent Updates (2025-10-26)
- ✅ Completed Phase 3: AI-Assisted Todo Creation
- ✅ Implemented interview-style AI coaching for todo creation
- ✅ Added duplicate detection and clarifying questions
- ✅ Integrated Cloudflare AI (LLaMA 3.1 8B Instruct)
- ✅ Created `useAuthenticatedApi` hook to eliminate code duplication
- ✅ Removed AI joke proof-of-concept feature
- ✅ Added comprehensive E2E test suite for AI features
- ✅ Updated WORKPLAN.md with Phase 3 completion and new Phase 4 (Productivity Tracking)

### Recent Updates (Earlier in 2025-10-26)
- ✅ Completed Phase 2: End-to-End Encryption
- ✅ Implemented two-tier encryption (DEK/KEK)
- ✅ Added encrypted todo list with full CRUD
- ✅ Added encrypted secret note feature
- ✅ Created comprehensive test suite (unit, API, E2E)
- ✅ Verified database encryption (no plaintext storage)

## 👤 Maintainer
rjwalters

---

## Notes
- This workplan is a living document
- Update as features are completed
- Add new items as requirements emerge
- Review and adjust priorities weekly
