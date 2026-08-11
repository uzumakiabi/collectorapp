# CollectorApp

A Next.js 14 web application for collecting and managing data, with authentication and analytics.

## Tech Stack

- **Framework:** Next.js 14 (App Router) + React 18 + TypeScript
- **Database:** PostgreSQL via Prisma ORM
- **Auth:** NextAuth.js (credentials)
- **Storage:** Images stored as base64 in PostgreSQL
- **UI:** Tailwind CSS + shadcn/ui (Radix primitives)
- **Charts:** Chart.js, Recharts, Plotly.js
- **Maps:** MapLibre GL

## Getting Started

### Prerequisites

- Node.js 18+
- Yarn
- PostgreSQL database

### Installation

```bash
# 1. Install dependencies
yarn install

# 2. Configure environment variables
cp .env.example .env
# then fill in your values

# 3. Set up the database
npx prisma migrate dev
npx prisma db seed

# 4. Run the dev server
yarn dev
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
| `yarn dev` | Start the development server |
| `yarn build` | Build for production |
| `yarn start` | Start the production server |
| `yarn lint` | Run ESLint |

## Project Structure

```
app/          # Next.js App Router pages and API routes
components/   # Reusable UI components
hooks/        # Custom React hooks
lib/          # Shared utilities and libraries
prisma/       # Database schema and migrations
public/       # Static assets
scripts/      # Seed and utility scripts
types/        # TypeScript type definitions
```

## License

Private project.
