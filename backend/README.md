# CloudPay Backend

Production-oriented Spring Boot 3 / Java 21 API for CloudPay. Supabase Auth owns credentials and JWT issuance. Supabase Postgres stores the CloudPay profile, bank account, transaction, and notification tables through JPA/Flyway.

## Run

1. Copy .env.example to your deployment environment.
2. Set SUPABASE_PUBLISHABLE_KEY.
3. Set SUPABASE_DB_URL, SUPABASE_DB_USER, and SUPABASE_DB_PASSWORD to the connection values from Supabase Dashboard > Connect. Use sslmode=require.
4. Run mvn spring-boot:run from this directory.

The API is available at http://localhost:8080/api/v1; Swagger is at http://localhost:8080/swagger-ui.html.

## Security model

- POST /auth/register, /auth/login, and /auth/refresh delegate to Supabase Auth.
- Every protected request must carry a Supabase access token.
- Spring Security validates its signature against SUPABASE_JWKS_URL and validates the issuer.
- The JWT sub is the Supabase Auth UUID and is also the primary key of the CloudPay users row.
- Passwords are never stored by this service. Supabase Auth applies its managed password hashing. A BCrypt PasswordEncoder bean remains available for future local credentials and compatibility.
- The Supabase secret/service-role key is intentionally not used by the backend.

## API

See ../docs/architecture/API.md. Database migrations are in src/main/resources/db/migration.
