# CloudPay REST API

Base URL: http://localhost:8080/api/v1
Swagger UI: http://localhost:8080/swagger-ui.html

Protected endpoints require Authorization: Bearer <Supabase access_token>. Tokens are issued and refreshed by Supabase Auth; the API verifies their signature with Supabase JWKS and validates the issuer.

## Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /auth/register | Public | Create a Supabase Auth user and CloudPay profile |
| POST | /auth/login | Public | Password grant through Supabase Auth |
| POST | /auth/refresh | Public | Refresh a Supabase session |

Register body: { "email": "...", "password": "...", "fullName": "...", "phone": "..." }.

## User and banking

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /users/me | User | Current profile |
| PUT | /users/me | User | Update name and phone |
| POST | /users/upi-id | User | Generate a unique UPI ID |
| POST | /bank-accounts | User | Add a bank account |
| GET | /bank-accounts | User | List masked accounts |
| GET | /bank-accounts/balance | User | Primary account balance |
| GET | /dashboard | User | Balance and monthly analytics |

## Payments and QR

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /transactions/send | User | Transfer to a receiver UPI ID |
| POST | /transactions/receive | User | Simulate an incoming transfer from a sender UPI ID |
| GET | /transactions | User | Paginated transaction history |
| GET | /transactions/{id} | User | Owned transaction details |
| GET | /qr/generate | User | Generate a CloudPay payment deep link |
| POST | /qr/pay | User | Pay a QR deep link |
| GET | /notifications | User | User notifications |
| PATCH | /notifications/{id}/read | User | Mark a notification read |

## Admin

Admin access is based on the role stored in the Supabase Postgres users table.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /admin/dashboard | Admin | Platform KPIs |
| GET | /admin/analytics/transactions | Admin | Transaction analytics summary |

## Error response

{
  "timestamp": "2026-10-05T10:42:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Insufficient balance",
  "path": "/api/v1/transactions/send"
}
