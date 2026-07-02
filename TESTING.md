# Shaandar CRM — Supabase Testing Guide

## Important: Run the correct project

Port **3000** must serve **Next.js (shaandar-crm)**, not the old static `software-dashboard`.

```bash
cd C:\Users\Rathi\Projects\shaandar-crm
npm install
npm run dev
```

If port 3000 is busy, use:

```bash
npm run dev -- -p 3001
```

Ensure `.env.local` is in **`shaandar-crm`** folder (same level as `package.json`).

---

## Test 1 — Supabase client health

Open in browser (no login required):

```
http://localhost:3000/api/health/supabase
```

**Expected success:**

```json
{
  "ok": true,
  "configured": true,
  "connected": true,
  "employeeCount": 3
}
```

**If `configured: false`** → check `.env.local` keys and restart dev server.

**If `connected: false`** → SQL migration not run or wrong project URL/key.

---

## Test 2 — Employee list fetch

1. Login: `admin@shaandar.com` / `admin123`
2. Go to **Master Panel**
3. Table should show employees from Supabase (seed data if you ran `seed.sql`)

**Browser DevTools → Network → `employees`:**

- Status: **200**
- Response: `{ "employees": [...] }`

---

## Test 3 — End-to-end form insert

1. Click **Add New Employee**
2. Fill required fields:
   - Full Name, DOB, Mobile (10 digits), Employee Type
3. **Work:** Machine Assignment
4. **Family:** Add Mother + Child with ESI roles
5. **Documents:** Upload test PDF/image for Aadhar + PAN
6. **Bank:** Account number, IFSC, ESI/PF toggles, amounts
7. Click **Submit Employee**

**Expected:** Redirect to list with new employee at top.

**Verify in Supabase Dashboard → Table Editor → employees:**

| Column | Should contain |
|--------|----------------|
| `family_members` | JSON array with your entries |
| `document_paths` | `{ "aadhar": "employee-documents/...", "pan": "..." }` |
| `bank_account_number`, `ifsc_code` | Your bank data |
| `bonus_last_year`, etc. | Numeric values |

**Verify Storage → employee-documents bucket** has uploaded files.

---

## Common errors

| Error | Fix |
|-------|-----|
| `503 Supabase is not configured` | Add `.env.local`, restart server |
| `401 Unauthorized` on `/api/employees` | Login first |
| `404` on `/master-panel` | Wrong app on port 3000 — run shaandar-crm |
| Storage upload failed | Re-run migration SQL (bucket section) |
| `relation "employees" does not exist` | Run `001_create_employees.sql` |

---

## Quick DevTools checks

```javascript
// After login, in browser console:
fetch('/api/employees').then(r => r.json()).then(console.log)
fetch('/api/health/supabase').then(r => r.json()).then(console.log)
```
