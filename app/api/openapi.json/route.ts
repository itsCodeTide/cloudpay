import { NextRequest, NextResponse } from 'next/server'

const json = (schema: Record<string, unknown>) => ({
  content: { 'application/json': { schema } },
})

const errorResponse = (description: string) => ({
  description,
  ...json({ $ref: '#/components/schemas/Error' }),
})

const pinSchema = { type: 'string', pattern: '^\\d{4,6}$', minLength: 4, maxLength: 6 }
const uuidSchema = { type: 'string', format: 'uuid' }

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'CloudPay API',
    version: '1.1.0',
    description: 'CloudPay Next.js API routes. Authenticate with a CloudPay bearer token returned by login, registration, or Firebase authentication. These test-ledger endpoints do not process real bank transfers.',
  },
  servers: [{ url: '/', description: 'CloudPay Next.js API (same origin)' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: { message: { type: 'string' }, error: { type: 'string' } },
      },
      User: {
        type: 'object',
        properties: {
          id: uuidSchema,
          email: { type: 'string', format: 'email' },
          fullName: { type: 'string' },
          phone: { type: 'string', nullable: true },
          upiId: { type: 'string', nullable: true },
          role: { type: 'string', enum: ['USER', 'ADMIN'] },
          kycVerified: { type: 'boolean' },
          kycStatus: { type: 'string', nullable: true },
          pendingEmail: { type: 'string', format: 'email', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          accessToken: { type: 'string', nullable: true },
          refreshToken: { type: 'string', nullable: true },
          tokenType: { type: 'string' },
          expiresIn: { type: 'integer' },
          user: { $ref: '#/components/schemas/User' },
        },
      },
      BankAccount: {
        type: 'object',
        properties: {
          id: uuidSchema,
          userId: uuidSchema,
          accountNumber: { type: 'string', description: 'Masked or redacted in account-list responses' },
          ifscCode: { type: 'string' },
          bankName: { type: 'string' },
          accountHolderName: { type: 'string' },
          upiId: { type: 'string', nullable: true },
          upiName: { type: 'string', nullable: true },
          upiNumber: { type: 'string', nullable: true },
          balance: { type: 'number', nullable: true, description: 'Withheld by the account-list endpoint' },
          primary: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Transaction: {
        type: 'object',
        properties: {
          id: uuidSchema,
          transactionRef: { type: 'string' },
          senderId: uuidSchema,
          receiverId: uuidSchema,
          senderUpiId: { type: 'string' },
          receiverUpiId: { type: 'string' },
          amount: { type: 'number' },
          remark: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['PENDING', 'SUCCESS', 'FAILED'] },
          createdAt: { type: 'string', format: 'date-time' },
          completedAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      Notification: {
        type: 'object',
        properties: {
          id: uuidSchema,
          title: { type: 'string' },
          message: { type: 'string' },
          type: { type: 'string' },
          read: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      QrResponse: {
        type: 'object',
        properties: {
          upiId: { type: 'string' },
          upiName: { type: 'string' },
          upiNumber: { type: 'string', nullable: true },
          bankAccountId: { ...uuidSchema, nullable: true },
          payload: { type: 'string' },
          format: { type: 'string', example: 'UPI_QR' },
        },
      },
      BalanceResponse: {
        type: 'object',
        properties: {
          availableBalance: { type: 'number' },
          accounts: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: uuidSchema,
                bankName: { type: 'string' },
                accountNumber: { type: 'string', description: 'Masked to the final four digits' },
                balance: { type: 'number' },
                primary: { type: 'boolean' },
              },
            },
          },
          expiresAt: { type: 'string', format: 'date-time' },
        },
      },
      KycVerification: {
        type: 'object',
        nullable: true,
        properties: {
          id: uuidSchema,
          status: { type: 'string' },
          provider: { type: 'string' },
          externalReference: { type: 'string' },
          legalName: { type: 'string' },
          governmentIdLast4: { type: 'string', nullable: true },
          submittedAt: { type: 'string', format: 'date-time' },
          reviewedAt: { type: 'string', format: 'date-time', nullable: true },
          rejectionReason: { type: 'string', nullable: true },
        },
      },
      RazorpayOrder: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          amount: { type: 'integer', description: 'Amount in paise' },
          currency: { type: 'string' },
          receipt: { type: 'string' },
          status: { type: 'string' },
          demo: { type: 'boolean' },
          key: { type: 'string' },
        },
      },
      AdminDashboard: {
        type: 'object',
        properties: {
          metrics: { type: 'object', additionalProperties: true },
          volumeByDay: { type: 'array', items: { type: 'object', additionalProperties: true } },
          recentTransactions: { type: 'array', items: { type: 'object', additionalProperties: true } },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/api/openapi.json': {
      get: {
        security: [],
        tags: ['Documentation'],
        summary: 'Get the OpenAPI specification',
        responses: {
          '200': {
            description: 'OpenAPI 3.0 specification for the CloudPay Next.js API',
            ...json({ type: 'object', additionalProperties: true }),
          },
        },
      },
    },
    '/api/auth/register': {
      post: {
        security: [],
        tags: ['Auth'],
        summary: 'Register using the legacy CloudPay/Supabase email flow',
        requestBody: {
          required: true,
          ...json({
            type: 'object',
            required: ['email', 'password'],
            properties: {
              email: { type: 'string', format: 'email' },
              password: { type: 'string', minLength: 8 },
              fullName: { type: 'string' },
              phone: { type: 'string' },
            },
          }),
        },
        responses: {
          '201': { description: 'Registered', ...json({ $ref: '#/components/schemas/AuthResponse' }) },
          '200': { description: 'Existing account signed in', ...json({ $ref: '#/components/schemas/AuthResponse' }) },
          '400': errorResponse('Invalid registration details'),
          '409': errorResponse('Email or phone already registered'),
          '500': errorResponse('Registration failed'),
        },
      },
    },
    '/api/auth/login': {
      post: {
        security: [],
        tags: ['Auth'],
        summary: 'Login using the legacy CloudPay/Supabase email flow',
        requestBody: {
          required: true,
          ...json({
            type: 'object',
            required: ['email', 'password'],
            properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } },
          }),
        },
        responses: {
          '200': { description: 'Logged in', ...json({ $ref: '#/components/schemas/AuthResponse' }) },
          '400': errorResponse('Email and password are required'),
          '401': errorResponse('Invalid credentials'),
          '500': errorResponse('Login failed'),
        },
      },
    },
    '/api/auth/firebase': {
      post: {
        security: [],
        tags: ['Auth'],
        summary: 'Exchange a verified Firebase ID token for a CloudPay session',
        requestBody: {
          required: true,
          ...json({
            type: 'object',
            required: ['idToken'],
            properties: {
              idToken: { type: 'string', description: 'Firebase ID token returned by Firebase Authentication' },
              email: { type: 'string', format: 'email', description: 'Optional; checked against the verified token' },
              uid: { type: 'string', description: 'Optional; checked against the verified token' },
              fullName: { type: 'string' },
              phone: { type: 'string' },
              photoUrl: { type: 'string', format: 'uri' },
            },
          }),
        },
        responses: {
          '200': { description: 'CloudPay session issued', ...json({ $ref: '#/components/schemas/AuthResponse' }) },
          '400': errorResponse('Firebase ID token is required'),
          '401': errorResponse('Firebase token is invalid or expired'),
          '502': errorResponse('Firebase token verification failed'),
          '503': errorResponse('Firebase project or API configuration mismatch'),
          '500': errorResponse('Unable to provision CloudPay profile'),
        },
      },
    },
    '/api/auth/google': {
      post: {
        security: [],
        deprecated: true,
        tags: ['Auth'],
        summary: 'Legacy alias for Firebase ID-token authentication',
        description: 'Use POST /api/auth/firebase for new integrations.',
        requestBody: {
          required: true,
          ...json({
            type: 'object',
            required: ['idToken'],
            properties: {
              idToken: { type: 'string' },
              email: { type: 'string', format: 'email' },
              uid: { type: 'string' },
              fullName: { type: 'string' },
              phone: { type: 'string' },
              photoUrl: { type: 'string', format: 'uri' },
            },
          }),
        },
        responses: {
          '200': { description: 'CloudPay session issued', ...json({ $ref: '#/components/schemas/AuthResponse' }) },
          '400': errorResponse('Firebase ID token is required'),
          '401': errorResponse('Firebase token is invalid or expired'),
          '502': errorResponse('Firebase token verification failed'),
          '503': errorResponse('Firebase project or API configuration mismatch'),
        },
      },
    },
    '/api/auth/sync': {
      post: {
        tags: ['Auth'],
        summary: 'Synchronize the authenticated CloudPay profile',
        responses: {
          '200': { description: 'Profile synchronized', ...json({ $ref: '#/components/schemas/AuthResponse' }) },
          '401': errorResponse('Unauthorized'),
          '500': errorResponse('Profile synchronization failed'),
        },
      },
    },
    '/api/auth/refresh': {
      post: {
        security: [],
        tags: ['Auth'],
        summary: 'Refresh a Supabase session',
        requestBody: {
          required: true,
          ...json({ type: 'object', required: ['refreshToken'], properties: { refreshToken: { type: 'string' } } }),
        },
        responses: {
          '200': { description: 'Session refreshed', ...json({ $ref: '#/components/schemas/AuthResponse' }) },
          '400': errorResponse('Refresh token is required'),
          '401': errorResponse('Invalid or expired refresh token'),
          '500': errorResponse('Token refresh failed'),
        },
      },
    },
    '/api/auth/logout': {
      post: {
        security: [],
        tags: ['Auth'],
        summary: 'Logout the current client session',
        responses: {
          '200': {
            description: 'Logged out',
            ...json({ type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' } } }),
          },
        },
      },
    },
    '/api/dashboard': {
      get: {
        tags: ['Dashboard'],
        summary: 'Get activity and monthly spending/income without revealing balance',
        responses: {
          '200': {
            description: 'Dashboard summary',
            ...json({
              type: 'object',
              properties: {
                availableBalance: { type: 'null' },
                monthlySpending: { type: 'number' },
                monthlyIncome: { type: 'number' },
                totalTransactions: { type: 'integer' },
                unreadNotifications: { type: 'integer' },
                _cached: { type: 'boolean' },
              },
            }),
          },
          '401': errorResponse('Unauthorized'),
          '500': errorResponse('Dashboard request failed'),
        },
      },
    },
    '/api/dashboard/balance': {
      post: {
        tags: ['Dashboard'],
        summary: 'Reveal balances for 60 seconds after PIN verification',
        requestBody: { required: true, ...json({ type: 'object', required: ['pin'], properties: { pin: pinSchema } }) },
        responses: {
          '200': { description: 'PIN-verified balances', ...json({ $ref: '#/components/schemas/BalanceResponse' }) },
          '400': errorResponse('Incorrect or missing PIN'),
          '401': errorResponse('Unauthorized'),
          '429': errorResponse('Too many balance checks'),
          '500': errorResponse('Unable to check balance'),
        },
      },
    },
    '/api/admin/dashboard': {
      get: {
        tags: ['Admin'],
        summary: 'Get platform metrics and recent activity (admin only)',
        responses: {
          '200': { description: 'Admin dashboard', ...json({ $ref: '#/components/schemas/AdminDashboard' }) },
          '401': errorResponse('Unauthorized'),
          '403': errorResponse('Admin role required'),
          '500': errorResponse('Unable to load admin dashboard'),
        },
      },
    },
    '/api/banking': {
      get: {
        tags: ['Banking'],
        summary: 'List linked bank accounts',
        responses: {
          '200': { description: 'Accounts', ...json({ type: 'array', items: { $ref: '#/components/schemas/BankAccount' } }) },
          '401': errorResponse('Unauthorized'),
          '500': errorResponse('Unable to list accounts'),
        },
      },
      post: {
        tags: ['Banking'],
        summary: 'Add a bank account and create its UPI ID',
        requestBody: {
          required: true,
          ...json({
            type: 'object',
            required: ['accountNumber', 'ifscCode', 'bankName', 'accountHolderName'],
            properties: {
              accountNumber: { type: 'string' },
              ifscCode: { type: 'string' },
              bankName: { type: 'string' },
              accountHolderName: { type: 'string' },
              upiName: { type: 'string' },
              upiNumber: { type: 'string' },
              makePrimary: { type: 'boolean' },
            },
          }),
        },
        responses: {
          '201': { description: 'Account added', ...json({ $ref: '#/components/schemas/BankAccount' }) },
          '400': errorResponse('Invalid account'),
          '401': errorResponse('Unauthorized'),
          '409': errorResponse('Account already linked'),
          '500': errorResponse('Unable to add account'),
        },
      },
      put: {
        tags: ['Banking'],
        summary: 'Select the primary payment account',
        parameters: [{ name: 'id', in: 'query', required: true, schema: uuidSchema }],
        responses: {
          '200': { description: 'Primary account updated', ...json({ $ref: '#/components/schemas/BankAccount' }) },
          '400': errorResponse('Account not found'),
          '401': errorResponse('Unauthorized'),
        },
      },
      delete: {
        tags: ['Banking'],
        summary: 'Remove a bank account',
        parameters: [{ name: 'id', in: 'query', required: true, schema: uuidSchema }],
        responses: {
          '200': { description: 'Account removed', ...json({ type: 'object', properties: { success: { type: 'boolean' } } }) },
          '400': errorResponse('Account ID required'),
          '401': errorResponse('Unauthorized'),
          '500': errorResponse('Unable to remove account'),
        },
      },
    },
    '/api/transactions': {
      get: {
        tags: ['Transactions'],
        summary: 'Get paged transaction history',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 0, default: 0 } },
          { name: 'size', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
        ],
        responses: {
          '200': {
            description: 'Paged history',
            ...json({
              type: 'object',
              properties: {
                content: { type: 'array', items: { $ref: '#/components/schemas/Transaction' } },
                page: { type: 'integer' },
                size: { type: 'integer' },
                totalElements: { type: 'integer' },
                totalPages: { type: 'integer' },
              },
            }),
          },
          '401': errorResponse('Unauthorized'),
          '500': errorResponse('Unable to fetch history'),
        },
      },
    },
    '/api/transactions/send': {
      post: {
        tags: ['Transactions'],
        summary: 'Transfer money to a UPI ID in the internal test ledger',
        parameters: [{
          name: 'X-Idempotency-Key',
          in: 'header',
          required: false,
          schema: { type: 'string' },
          description: 'Optional key to prevent duplicate transfers on retry',
        }],
        requestBody: {
          required: true,
          ...json({
            type: 'object',
            required: ['receiverUpiId', 'amount', 'pin'],
            properties: {
              receiverUpiId: { type: 'string', example: 'jane1234@cloudpay' },
              amount: { type: 'number', minimum: 0.01, maximum: 100000 },
              remark: { type: 'string', maxLength: 255 },
              sourceBankAccountId: uuidSchema,
              pin: pinSchema,
              selfTransfer: { type: 'boolean', description: 'Set true only when testing a transfer to your own account' },
            },
          }),
        },
        responses: {
          '200': { description: 'Transfer completed', ...json({ $ref: '#/components/schemas/Transaction' }) },
          '400': errorResponse('Invalid PIN, balance, amount, or transfer type'),
          '401': errorResponse('Unauthorized'),
          '404': errorResponse('UPI ID not found'),
          '409': errorResponse('Duplicate transfer'),
          '500': errorResponse('Transfer failed'),
        },
      },
    },
    '/api/qr/generate': {
      get: {
        tags: ['QR & UPI'],
        summary: 'Generate a receive QR for a selected account',
        parameters: [{ name: 'accountId', in: 'query', required: false, schema: uuidSchema }],
        responses: {
          '200': { description: 'QR payload', ...json({ $ref: '#/components/schemas/QrResponse' }) },
          '401': errorResponse('Unauthorized'),
          '500': errorResponse('Unable to generate QR'),
        },
      },
    },
    '/api/qr/pay': {
      post: {
        tags: ['QR & UPI'],
        summary: 'Pay a QR payload or UPI ID',
        requestBody: {
          required: true,
          ...json({
            type: 'object',
            required: ['payload', 'amount', 'pin'],
            properties: {
              payload: { type: 'string', example: 'upi://pay?pa=jane1234@cloudpay&am=500' },
              amount: { type: 'number', minimum: 0.01 },
              remark: { type: 'string', maxLength: 255 },
              pin: pinSchema,
              sourceBankAccountId: uuidSchema,
            },
          }),
        },
        responses: {
          '200': { description: 'QR payment completed', ...json({ $ref: '#/components/schemas/Transaction' }) },
          '400': errorResponse('Invalid PIN, balance, amount, or QR payload'),
          '401': errorResponse('Unauthorized'),
          '404': errorResponse('UPI ID not found'),
          '500': errorResponse('QR payment failed'),
        },
      },
    },
    '/api/users/upi-id': {
      post: {
        tags: ['Users'],
        summary: 'Create the user-level UPI ID if one is not set',
        responses: {
          '200': { description: 'User profile with UPI ID', ...json({ $ref: '#/components/schemas/User' }) },
          '401': errorResponse('Unauthorized'),
          '500': errorResponse('Unable to create UPI ID'),
        },
      },
    },
    '/api/users/transaction-pin': {
      get: {
        tags: ['Users'],
        summary: 'Check transaction PIN status',
        responses: {
          '200': { description: 'PIN status', ...json({ type: 'object', properties: { configured: { type: 'boolean' } } }) },
          '401': errorResponse('Unauthorized'),
        },
      },
      post: {
        tags: ['Users'],
        summary: 'Set or replace transaction PIN',
        requestBody: {
          required: true,
          ...json({
            type: 'object',
            required: ['pin', 'confirmPin'],
            properties: {
              currentPin: { ...pinSchema, description: 'Required when replacing an existing PIN' },
              pin: pinSchema,
              confirmPin: pinSchema,
            },
          }),
        },
        responses: {
          '200': { description: 'PIN saved', ...json({ type: 'object', properties: { configured: { type: 'boolean' } } }) },
          '400': errorResponse('Invalid PIN or current PIN'),
          '401': errorResponse('Unauthorized'),
          '429': errorResponse('Too many attempts'),
          '500': errorResponse('Unable to save PIN'),
        },
      },
    },
    '/api/users/me': {
      get: {
        tags: ['Users'],
        summary: 'Get current profile',
        responses: {
          '200': { description: 'Profile', ...json({ $ref: '#/components/schemas/User' }) },
          '401': errorResponse('Unauthorized'),
          '500': errorResponse('Unable to fetch profile'),
        },
      },
      patch: {
        tags: ['Users'],
        summary: 'Edit name, phone, and email',
        requestBody: {
          required: true,
          ...json({
            type: 'object',
            required: ['fullName', 'phone', 'email'],
            properties: {
              fullName: { type: 'string', minLength: 2, maxLength: 150 },
              phone: { type: 'string', maxLength: 20 },
              email: { type: 'string', format: 'email' },
            },
          }),
        },
        responses: {
          '200': {
            description: 'Profile updated',
            ...json({
              type: 'object',
              properties: {
                user: { $ref: '#/components/schemas/User' },
                emailChangePending: { type: 'boolean' },
              },
            }),
          },
          '400': errorResponse('Validation or email update error'),
          '401': errorResponse('Unauthorized'),
          '409': errorResponse('Email already in use'),
          '500': errorResponse('Unable to update profile'),
        },
      },
    },
    '/api/kyc': {
      get: {
        tags: ['KYC'],
        summary: 'Get latest KYC status',
        responses: {
          '200': { description: 'Latest KYC record, or null if not submitted', ...json({ $ref: '#/components/schemas/KycVerification' }) },
          '401': errorResponse('Unauthorized'),
          '500': errorResponse('Unable to fetch KYC status'),
        },
      },
      post: {
        tags: ['KYC'],
        summary: 'Submit consent and masked identity details for KYC review',
        requestBody: {
          required: true,
          ...json({
            type: 'object',
            required: ['legalName', 'governmentIdLast4', 'consent'],
            properties: {
              legalName: { type: 'string', minLength: 2, maxLength: 150 },
              dateOfBirth: { type: 'string', format: 'date' },
              governmentIdLast4: { type: 'string', pattern: '^\\d{4}$' },
              consent: { type: 'boolean', enum: [true] },
            },
          }),
        },
        responses: {
          '201': { description: 'KYC submitted', ...json({ $ref: '#/components/schemas/KycVerification' }) },
          '400': errorResponse('Invalid KYC details or missing consent'),
          '401': errorResponse('Unauthorized'),
          '500': errorResponse('Unable to submit KYC'),
        },
      },
    },
    '/api/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'List latest notifications',
        responses: {
          '200': { description: 'Notifications', ...json({ type: 'array', items: { $ref: '#/components/schemas/Notification' } }) },
          '401': errorResponse('Unauthorized'),
          '500': errorResponse('Unable to load notifications'),
        },
      },
      patch: {
        tags: ['Notifications'],
        summary: 'Mark a notification as read',
        parameters: [{ name: 'id', in: 'query', required: true, schema: uuidSchema }],
        responses: {
          '200': { description: 'Notification marked read', ...json({ $ref: '#/components/schemas/Notification' }) },
          '400': errorResponse('Missing notification ID'),
          '401': errorResponse('Unauthorized'),
          '404': errorResponse('Notification not found'),
          '500': errorResponse('Unable to update notification'),
        },
      },
    },
    '/api/razorpay': {
      post: {
        tags: ['Razorpay'],
        summary: 'Create a Razorpay order or demo test order',
        requestBody: {
          required: true,
          ...json({
            type: 'object',
            required: ['amount'],
            properties: {
              amount: { type: 'number', minimum: 1, description: 'Amount in INR' },
              currency: { type: 'string', default: 'INR' },
              receipt: { type: 'string' },
              notes: { type: 'object', additionalProperties: { type: 'string' } },
            },
          }),
        },
        responses: {
          '200': { description: 'Order created', ...json({ $ref: '#/components/schemas/RazorpayOrder' }) },
          '400': errorResponse('Invalid amount'),
          '500': errorResponse('Unable to create order'),
        },
      },
      put: {
        tags: ['Razorpay'],
        summary: 'Verify payment and credit the authenticated internal test balance',
        requestBody: {
          required: true,
          ...json({
            type: 'object',
            properties: {
              razorpay_order_id: { type: 'string' },
              razorpay_payment_id: { type: 'string' },
              razorpay_signature: { type: 'string' },
              amount: { type: 'number', minimum: 0.01 },
            },
          }),
        },
        responses: {
          '200': {
            description: 'Payment verification result',
            ...json({
              type: 'object',
              properties: {
                verified: { type: 'boolean' },
                demo: { type: 'boolean' },
                paymentId: { type: 'string', nullable: true },
                credited: { type: 'boolean' },
              },
            }),
          },
          '400': errorResponse('Missing payment details or invalid signature'),
          '500': errorResponse('Payment verification failed'),
        },
      },
    },
    '/api/razorpay/verify': {
      post: {
        tags: ['Razorpay'],
        summary: 'Compatibility alias for Razorpay payment verification',
        description: 'Same behavior as PUT /api/razorpay.',
        requestBody: {
          required: true,
          ...json({
            type: 'object',
            properties: {
              razorpay_order_id: { type: 'string' },
              razorpay_payment_id: { type: 'string' },
              razorpay_signature: { type: 'string' },
              amount: { type: 'number', minimum: 0.01 },
            },
          }),
        },
        responses: {
          '200': {
            description: 'Payment verification result',
            ...json({
              type: 'object',
              properties: {
                verified: { type: 'boolean' },
                demo: { type: 'boolean' },
                paymentId: { type: 'string', nullable: true },
                credited: { type: 'boolean' },
              },
            }),
          },
          '400': errorResponse('Missing payment details or invalid signature'),
          '500': errorResponse('Payment verification failed'),
        },
      },
    },
  },
}

export async function GET(req: NextRequest) {
  const origin = new URL(req.url).origin
  return NextResponse.json(
    { ...spec, servers: [{ url: origin, description: 'CloudPay Next.js API' }] },
    { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
  )
}
