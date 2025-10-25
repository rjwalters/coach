# Database Scripts

This directory contains utility scripts for managing the Coach database.

## Available Scripts

### Migration Scripts

Run from the project root:

```bash
# Local development database
npm run db:migrate:local

# Remote/production database
npm run db:migrate:remote
```

### Database Management

```bash
# Create database (first time setup)
npm run db:create

# Create production database
npm run db:create:prod

# Backup databases
npm run db:backup:local
npm run db:backup:remote

# View database contents
npm run db:console:local
npm run db:console:remote
```

### Reset Database (WARNING: Deletes all data!)

```bash
# Local
wrangler d1 execute coach-db --local --file=./scripts/reset-db.sql
wrangler d1 execute coach-db --local --file=./schema.sql

# Remote (use with caution!)
wrangler d1 execute coach-db --remote --file=./scripts/reset-db.sql
wrangler d1 execute coach-db --remote --file=./schema.sql
```

### Seed Development Data

```bash
# Local only - for testing
wrangler d1 execute coach-db --local --file=./scripts/seed-dev.sql
```

## Migration Files

Migration files are stored in `/migrations` directory and should be numbered sequentially:
- `001_initial.sql` - Initial schema
- `002_feature_name.sql` - Next migration
- etc.

## Notes

- Always test migrations on local database first
- Create backups before running migrations on production
- User IDs are derived from passphrases, not stored directly
- Todo data is encrypted client-side before being stored
