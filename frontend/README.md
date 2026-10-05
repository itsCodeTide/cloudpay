# CloudPay Frontend

Next.js 15 · TypeScript · Tailwind CSS · ShadCN UI · Recharts

## Route Groups

| Group | Routes | Access |
|-------|--------|--------|
| `(auth)` | `/login`, `/register` | Public |
| `(dashboard)` | `/dashboard`, `/send`, `/receive`, `/qr`, `/transactions`, `/profile`, `/banking` | Authenticated |
| `(admin)` | `/admin`, `/admin/users` | Admin role |

## Directory Overview

```
frontend/
├── app/              # App Router pages & layouts
├── components/       # UI by feature domain
├── hooks/            # useAuth, useTransactions, etc.
├── lib/              # Utilities & constants
├── services/         # API client layer
├── store/            # Auth & session state
└── types/            # TypeScript interfaces
```

## Run Locally

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000
