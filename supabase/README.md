# Supabase Setup — Shaandar CRM

## What you need from Supabase Dashboard

Create a project at [supabase.com](https://supabase.com), then collect:

| Value | Where to find it |
|-------|------------------|
| **Project URL** | Settings → API → Project URL |
| **Anon public key** | Settings → API → `anon` `public` |
| **Service role key** | Settings → API → `service_role` (secret — server only) |

## Step 1 — Environment variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
```

Restart dev server after saving `.env.local`.

## Step 2 — Run database migration

1. Open **Supabase Dashboard → SQL Editor**
2. Paste contents of `supabase/migrations/001_create_employees.sql`
3. Click **Run**

Optional test data:

```sql
-- Paste supabase/seed.sql
```

## Step 3 — Install packages

```bash
npm install
```

## Architecture

```
Browser → /api/employees (GET/POST)
              ↓
        Service Role Client (server-only)
              ↓
        Supabase PostgreSQL + Storage
```

- **employees** table — all form fields
- **family_members** — JSONB array
- **document_paths** — JSONB storage paths only (no Aadhaar/PAN numbers)
- **employee-documents** bucket — private file storage

## Security notes

- Never commit `.env.local` or expose `SUPABASE_SERVICE_ROLE_KEY` to the browser
- Document files stored as paths in `document_paths`, not plain-text IDs
- RLS enabled; API routes use service role until Supabase Auth is connected
