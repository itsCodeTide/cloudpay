# CloudPay — Project Folder Structure

Production-grade UPI Payment Simulator monorepo.

```
cloud-pay-fintech-web-app/
│
├── frontend/                          # Next.js 15 + TypeScript + Tailwind + ShadCN
│   ├── app/                           # App Router (pages, layouts, API routes)
│   │   ├── (auth)/                    # Auth route group (login, register)
│   │   ├── (dashboard)/               # Protected user routes
│   │   ├── (admin)/                   # Admin-only routes
│   │   ├── api/                       # Next.js API routes (BFF / proxy optional)
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                        # ShadCN primitives
│   │   ├── layout/                    # Sidebar, Header, Footer
│   │   ├── auth/                      # Login, Register forms
│   │   ├── banking/                   # Bank account, balance
│   │   ├── payments/                  # Send, receive, history
│   │   ├── qr/                        # QR generate & scan
│   │   ├── admin/                     # Analytics dashboards
│   │   └── shared/                    # Reusable domain components
│   ├── hooks/                         # Custom React hooks
│   ├── lib/                           # Utilities, cn(), constants
│   ├── services/                      # API client layer (axios/fetch)
│   ├── store/                         # Client state (auth, user)
│   ├── types/                         # TypeScript interfaces & enums
│   ├── middleware.ts                  # Route protection
│   ├── public/                        # Static assets
│   └── tests/                         # Frontend tests
│
├── backend/                           # Spring Boot 3 + Java 21
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/cloudpay/
│   │   │   │   ├── CloudPayApplication.java
│   │   │   │   │
│   │   │   │   ├── domain/            # Clean Architecture — Domain Layer
│   │   │   │   │   ├── model/         # Entities (User, BankAccount, Transaction)
│   │   │   │   │   ├── enums/         # TransactionStatus, Role
│   │   │   │   │   ├── repository/    # Repository interfaces (ports)
│   │   │   │   │   └── exception/     # Domain exceptions
│   │   │   │   │
│   │   │   │   ├── application/       # Use Cases / Application Services
│   │   │   │   │   ├── dto/           # Request/Response DTOs
│   │   │   │   │   ├── mapper/        # Entity ↔ DTO mappers
│   │   │   │   │   └── service/       # Auth, User, Banking, Payment, QR, Admin
│   │   │   │   │
│   │   │   │   └── infrastructure/    # Adapters — Framework & External
│   │   │   │       ├── config/        # Security, JWT, Swagger, CORS
│   │   │   │       ├── persistence/   # JPA entities, repositories
│   │   │   │       ├── security/      # JWT filter, UserDetails
│   │   │   │       ├── web/           # REST controllers
│   │   │   │       └── exception/     # GlobalExceptionHandler
│   │   │   │
│   │   │   └── resources/
│   │   │       ├── application.yml
│   │   │       ├── application-dev.yml
│   │   │       ├── application-prod.yml
│   │   │       └── db/migration/      # Flyway SQL migrations
│   │   │
│   │   └── test/
│   │       └── java/com/cloudpay/
│   │
│   ├── Dockerfile
│   └── pom.xml
│
├── docker/
│   ├── postgres/
│   │   └── init.sql
│   └── nginx/
│       └── nginx.conf                 # Optional reverse proxy
│
├── docs/
│   ├── architecture/
│   │   ├── FOLDER_STRUCTURE.md        # This file
│   │   ├── API.md                     # API overview
│   │   └── DATABASE.md                # Schema documentation
│   └── postman/
│       └── CloudPay.postman_collection.json
│
├── docker-compose.yml
├── docker-compose.dev.yml
├── .env.example
├── pnpm-workspace.yaml
└── README.md
```

## Layer Responsibilities

### Frontend
| Folder | Purpose |
|--------|---------|
| `app/(auth)` | Public auth pages — login, register |
| `app/(dashboard)` | Authenticated user flows — send, receive, QR, profile |
| `app/(admin)` | Role-guarded admin analytics |
| `services/` | HTTP calls to Spring Boot API |
| `store/` | JWT token & session state |
| `types/` | Shared TS types mirroring backend DTOs |

### Backend (Clean Architecture)
| Layer | Purpose |
|-------|---------|
| `domain/` | Business rules, entities, repository contracts — no framework deps |
| `application/` | Orchestration, DTOs, mappers, use-case services |
| `infrastructure/` | Spring controllers, JPA, security, external adapters |

## Database Entities

```
User ─────────────┬── BankAccount (1:N)
                  └── Transaction (sender/receiver)

TransactionStatus: PENDING | SUCCESS | FAILED
```

## API Modules

| Module | Endpoints |
|--------|-----------|
| Auth | `/api/v1/auth/register`, `/login`, `/refresh` |
| Users | `/api/v1/users/me`, `/upi-id` |
| Banking | `/api/v1/bank-accounts`, `/balance` |
| Payments | `/api/v1/transactions/send`, `/receive`, `/history` |
| QR | `/api/v1/qr/generate`, `/pay` |
| Admin | `/api/v1/admin/dashboard`, `/analytics` |
