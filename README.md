# Shaandar CRM (शानदार CRM)

Modern Light Corporate CRM built with Next.js, TypeScript, and Tailwind CSS.

## Features (Phase 1)

- Corporate login page (email + password)
- Protected dashboard with permanent left sidebar navigation
- Light corporate theme (`#F8FAFC` background, `#1E293B` text, corporate blue accents)
- Lucide icons for all navigation items

## Demo Login

| Field | Value |
|-------|-------|
| Email | `admin@shaandar.com` |
| Password | `admin123` |

## Getting Started

```bash
cd shaandar-crm
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/          # Protected routes with sidebar layout
│   ├── login/                # Login page + auth actions
│   ├── layout.tsx
│   └── page.tsx              # Redirects to login or dashboard
├── components/layout/        # Sidebar, DashboardShell
├── constants/nav-config.ts   # Sidebar menu items + Lucide icons
└── lib/                      # Auth helpers, utilities
```

## Tech Stack

- **Next.js 15** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Lucide React** (icons)

## Next Phases

- Supabase authentication (replace demo login)
- Lead & Contact Management
- Deal Pipeline / Kanban
- Dashboard Analytics with real data
