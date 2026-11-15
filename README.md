# CollectorApp

A Next.js 14 web application for collecting and managing data, with authentication and analytics.

## Tech Stack

- **Framework:** Next.js 14 (App Router) + React 18 + TypeScript
- **Database:** PostgreSQL via Prisma ORM
- **Auth:** NextAuth.js (credentials)
- **Storage:** Images stored as base64 in PostgreSQL
- **UI:** Tailwind CSS + shadcn/ui (Radix primitives)
- **Charts:** Recharts
- **Tests:** Vitest

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- PostgreSQL database

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env
# then fill in your values

# 3. Set up the database
npx prisma migrate dev
npx prisma db seed

# 4. Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Environment Variables

See `.env.example` for the full list of required variables:

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Secret used to sign NextAuth sessions |
| `NEXTAUTH_URL` | Base URL of the app |

## Scripts

| Command | Description |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run `tsc --noEmit` |
| `npm test` | Run the Vitest suite |

## Features

- Collection items with photos, categories, custom fields and custom folders
- CSV import and CSV export, plus PDF and Excel export
- JSON backup of your collection, categories and folders (`/api/backup`)
- Price history per item, shown in the item view and used by the dashboard

## Deployment & migrations

Railway runs `npx prisma db push` as part of the start command, so the schema is
synced without applying migration files. New migration files live in
`prisma/migrations`.

To switch the start command to `prisma migrate deploy`, first mark the existing
migrations as already applied against production, once each:

```bash
npx prisma migrate resolve --applied 20260812000000_init
npx prisma migrate resolve --applied 20261115000000_sync_user_fields
npx prisma migrate resolve --applied 20261115010000_price_history_and_indexes
```

Note that the price-history backfill in the last migration does not run under
`db push`; the app tolerates missing history and simply shows no history for
those items.

## Password reset

Password reset requires an email provider, which is not configured. In
development the reset link is only written to the server log.

## Project Structure

```
app/          # Next.js App Router pages and API routes
components/   # Reusable UI components
hooks/        # Custom React hooks
lib/          # Shared utilities and libraries
prisma/       # Database schema and migrations
public/       # Static assets
scripts/      # Seed and utility scripts
tests/        # Vitest test suite
types/        # TypeScript type definitions
```

## License

Private project.
