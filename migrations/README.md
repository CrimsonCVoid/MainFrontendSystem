# Database Migrations

This directory contains SQL migration scripts for the MyMetalRoofer database.

## How to Run Migrations

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the contents of each migration file in order:
   - `001_create_promo_keys_table.sql`
   - `002_create_project_estimates_table.sql`
   - `003_add_roof_data_to_projects.sql`
5. Paste into the SQL editor and click **Run**
6. Verify the tables were created successfully

### Option 2: Supabase CLI

```bash
# Run all migrations
supabase db push

# Or run migrations individually
psql $DATABASE_URL -f migrations/001_create_promo_keys_table.sql
psql $DATABASE_URL -f migrations/002_create_project_estimates_table.sql
psql $DATABASE_URL -f migrations/003_add_roof_data_to_projects.sql
```

## Migration Details

### 001_create_promo_keys_table.sql
Creates the `promo_keys` table for storing promotional keys that allow one-time free project unlocks.

**Features:**
- 10-character unique keys
- One-time use enforcement
- Complete audit trail (who, what, when)
- Row Level Security enabled
- Indexes for performance

### 002_create_project_estimates_table.sql
Creates the `project_estimates` table for storing multiple estimate variations per project.

**Features:**
- Multiple estimates per project
- Auto-calculated total cost (generated column)
- Active estimate tracking
- Row Level Security (users see only their estimates)
- Auto-updating timestamp trigger

### 003_add_roof_data_to_projects.sql
Adds the `roof_data` JSONB column to the `projects` table.

**Features:**
- Stores roof geometry from 3D algorithm
- Indexed for efficient queries
- Includes measurements, panel config, and area calculations

## Verification

After running migrations, verify with:

```sql
-- Check promo_keys table exists
SELECT COUNT(*) FROM promo_keys;

-- Check project_estimates table exists
SELECT COUNT(*) FROM project_estimates;

-- Check roof_data column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'projects' AND column_name = 'roof_data';
```

## Rollback (if needed)

```sql
-- Rollback 003
ALTER TABLE projects DROP COLUMN IF EXISTS roof_data;

-- Rollback 002
DROP TABLE IF EXISTS project_estimates CASCADE;

-- Rollback 001
DROP TABLE IF EXISTS promo_keys CASCADE;
```

## Next Steps

After running these migrations:
1. Update TypeScript types in `lib/database.types.ts`
2. Regenerate types with: `npx supabase gen types typescript --local > lib/database.types.ts`
3. Restart your development server
