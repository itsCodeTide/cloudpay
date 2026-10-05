import { NextResponse } from 'next/server'

const json = (schema: Record<string, unknown>) => ({
  content: { 'application/json': { schema } },
})

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'CloudPay API',
    version: '1.0.0',
    description: 'CloudPay UPI-style wallet, bank-account, QR-payment, PIN, notification, and Razorpay test APIs.',
  },
  servers: [{ url: 'http://localhost:3000', description: 'Local Next.js API' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: { type: 'object', properties: { message: { type: 'string' } } },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }, email: { type: 'string', format: 'email' },
          fullName: { type: 'string' }, phone: { type: 'string', nullable: true },
          upiId: { type: 'string', nullable: true }, role: { type: 'string' },
          kycVerified: { type: 'boolean' }, createdAt: { type: 'string', format: 'date-time' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          accessToken: { type: 'string', nullable: true }, refreshToken: { type: 'string', nullable: true },
          tokenType: { type: 'string' }, expiresIn: { type: 'integer' }, user: { $ref: '#/components/schemas/User' },
        },
      },
      BankAccount: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }, userId: { type: 'string', format: 'uuid' },
          accountNumber: { type: 'string' }, ifscCode: { type: 'string' }, bankName: { type: 'string' },
          accountHolderName: { type: 'string' }, upiId: { type: 'string', nullable: true },
          upiName: { type: 'string', nullable: true }, upiNumber: { type: 'string', nullable: true },
          balance: { type: 'null', description: 'Withheld outside PIN-verified balance checks' }, primary: { type: 'boolean' }, createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Transaction: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }, transactionRef: { type: 'string' },
          senderId: { type: 'string', format: 'uuid' }, receiverId: { type: 'string', format: 'uuid' },
          senderUpiId: { type: 'string' }, receiverUpiId: { type: 'string' }, amount: { type: 'number' },
          remark: { type: 'string', nullable: true }, status: { type: 'string', enum: ['PENDING', 'SUCCESS', 'FAILED'] },
          createdAt: { type: 'string', format: 'date-time' }, completedAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      Notification: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }, title: { type: 'string' }, message: { type: 'string' },
          type: { type: 'string' }, read: { type: 'boolean' }, createdAt: { type: 'string', format: 'date-time' },
        },
      },
      QrResponse: {
        type: 'object',
        properties: {
          upiId: { type: 'string' }, upiName: { type: 'string' }, upiNumber: { type: 'string', nullable: true },
          bankAccountId: { type: 'string', format: 'uuid', nullable: true }, payload: { type: 'string' }, format: { type: 'string' },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/api/auth/register': {
      post: {
        security: [], tags: ['Auth'], summary: 'Register a user',
        requestBody: { required: true, ...json({ type: 'object', required: ['email', 'password', 'fullName'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' }, fullName: { type: 'string' }, phone: { type: 'string' } } }) },
        responses: { '201': { description: 'Registered', ...json({ $ref: '#/components/schemas/AuthResponse' }) }, '400': { description: 'Validation error' }, '409': { description: 'Email already registered' } },
      },
    },
    '/api/auth/login': {
      post: {
        security: [], tags: ['Auth'], summary: 'Login',
        requestBody: { required: true, ...json({ type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } } }) },
        responses: { '200': { description: 'Logged in', ...json({ $ref: '#/components/schemas/AuthResponse' }) }, '401': { description: 'Invalid credentials' } },
      },
    },
    '/api/auth/google': {
      post: {
        security: [], tags: ['Auth'], summary: 'Sign in with Google/Firebase identity',
        requestBody: { required: true, ...json({ type: 'object', required: ['uid', 'email'], properties: { uid: { type: 'string' }, email: { type: 'string', format: 'email' }, displayName: { type: 'string' }, phone: { type: 'string' }, idToken: { type: 'string' } } }) },
        responses: { '200': { description: 'Logged in', ...json({ $ref: '#/components/schemas/AuthResponse' }) }, '400': { description: 'Invalid identity' } },
      },
    },
    '/api/auth/sync': { post: { tags: ['Auth'], summary: 'Synchronize the authenticated profile', responses: { '200': { description: 'Profile synchronized' }, '401': { description: 'Unauthorized' } } } },
    '/api/auth/refresh': { post: { security: [], tags: ['Auth'], summary: 'Refresh a session', responses: { '200': { description: 'Session refreshed' }, '401': { description: 'Invalid refresh token' } } } },
    '/api/auth/logout': { post: { tags: ['Auth'], summary: 'Logout', responses: { '200': { description: 'Logged out' } } } },
    '/api/dashboard': { get: { tags: ['Dashboard'], summary: 'Get activity and monthly spending/income without balance', responses: { '200': { description: 'Dashboard', ...json({ type: 'object', properties: { availableBalance: { type: 'null', description: 'Always hidden on the home dashboard' }, monthlySpending: { type: 'number' }, monthlyIncome: { type: 'number' }, totalTransactions: { type: 'integer' }, unreadNotifications: { type: 'integer' } } }) }, '401': { description: 'Unauthorized' } } } },
    '/api/dashboard/balance': { post: { tags: ['Dashboard'], summary: 'Reveal balance for 60 seconds after PIN verification', requestBody: { required: true, ...json({ type: 'object', required: ['pin'], properties: { pin: { type: 'string', pattern: '^[0-9]{4,6}$' } } }) }, responses: { '200': { description: 'PIN-verified balances' }, '400': { description: 'Incorrect or missing PIN' }, '401': { description: 'Unauthorized' }, '429': { description: 'Too many balance checks' } } } },
    '/api/banking': {
      get: { tags: ['Banking'], summary: 'List linked bank accounts', responses: { '200': { description: 'Accounts', ...json({ type: 'array', items: { $ref: '#/components/schemas/BankAccount' } }) }, '401': { description: 'Unauthorized' } } },
      post: {
        tags: ['Banking'], summary: 'Add a bank account and create its UPI ID',
        requestBody: { required: true, ...json({ type: 'object', required: ['accountNumber', 'ifscCode', 'bankName', 'accountHolderName'], properties: { accountNumber: { type: 'string' }, ifscCode: { type: 'string' }, bankName: { type: 'string' }, accountHolderName: { type: 'string' }, upiName: { type: 'string' }, upiNumber: { type: 'string' }, makePrimary: { type: 'boolean' } } }) },
        responses: { '201': { description: 'Account added', ...json({ $ref: '#/components/schemas/BankAccount' }) }, '400': { description: 'Invalid account' }, '401': { description: 'Unauthorized' } },
      },
      put: { tags: ['Banking'], summary: 'Select the primary payment account', parameters: [{ name: 'id', in: 'query', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': { description: 'Primary account updated', ...json({ $ref: '#/components/schemas/BankAccount' }) }, '401': { description: 'Unauthorized' } } },
      delete: { tags: ['Banking'], summary: 'Remove a bank account', parameters: [{ name: 'id', in: 'query', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': { description: 'Account removed' }, '401': { description: 'Unauthorized' } } },
    },
    '/api/transactions': { get: { tags: ['Transactions'], summary: 'Transaction history', parameters: [{ name: 'page', in: 'query', schema: { type: 'integer', minimum: 0, default: 0 } }, { name: 'size', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } }], responses: { '200': { description: 'Paged history', ...json({ type: 'object', properties: { content: { type: 'array', items: { $ref: '#/components/schemas/Transaction' } }, page: { type: 'integer' }, size: { type: 'integer' }, totalElements: { type: 'integer' }, totalPages: { type: 'integer' } } }) }, '401': { description: 'Unauthorized' } } } },
    '/api/transactions/send': {
      post: {
        tags: ['Transactions'], summary: 'Send money to an account-specific UPI ID',
        requestBody: { required: true, ...json({ type: 'object', required: ['receiverUpiId', 'amount', 'pin'], properties: { receiverUpiId: { type: 'string', example: 'jane1234@cloudpay' }, amount: { type: 'number', minimum: 0.01 }, remark: { type: 'string', maxLength: 255 }, sourceBankAccountId: { type: 'string', format: 'uuid' }, pin: { type: 'string', pattern: '^[0-9]{4,6}$' } } }) },
        responses: { '200': { description: 'Transfer completed', ...json({ $ref: '#/components/schemas/Transaction' }) }, '400': { description: 'Invalid PIN, balance, or amount' }, '401': { description: 'Unauthorized' }, '404': { description: 'UPI ID not found' } },
      },
    },
    '/api/qr/generate': { get: { tags: ['QR & UPI'], summary: 'Generate a receive QR for a selected account', parameters: [{ name: 'accountId', in: 'query', schema: { type: 'string', format: 'uuid' } }], responses: { '200': { description: 'QR payload', ...json({ $ref: '#/components/schemas/QrResponse' }) }, '401': { description: 'Unauthorized' } } } },
    '/api/qr/pay': {
      post: {
        tags: ['QR & UPI'], summary: 'Pay a QR payload or UPI ID',
        requestBody: { required: true, ...json({ type: 'object', required: ['payload', 'amount', 'pin'], properties: { payload: { type: 'string', example: 'upi://pay?pa=jane1234@cloudpay&am=500' }, amount: { type: 'number', minimum: 0.01 }, remark: { type: 'string', maxLength: 255 }, pin: { type: 'string', pattern: '^[0-9]{4,6}$' }, sourceBankAccountId: { type: 'string', format: 'uuid' } } }) },
        responses: { '200': { description: 'QR payment completed', ...json({ $ref: '#/components/schemas/Transaction' }) }, '400': { description: 'Invalid PIN, balance, or QR payload' }, '401': { description: 'Unauthorized' }, '404': { description: 'UPI ID not found' } },
      },
    },
    '/api/users/upi-id': { post: { tags: ['Users'], summary: 'Create the user-level UPI ID', responses: { '200': { description: 'UPI ID created', ...json({ $ref: '#/components/schemas/User' }) }, '401': { description: 'Unauthorized' } } } },
    '/api/users/transaction-pin': {
      get: { tags: ['Users'], summary: 'Check transaction PIN status', responses: { '200': { description: 'PIN status', ...json({ type: 'object', properties: { configured: { type: 'boolean' } } }) }, '401': { description: 'Unauthorized' } } },
      post: { tags: ['Users'], summary: 'Set or replace transaction PIN', requestBody: { required: true, ...json({ type: 'object', required: ['pin', 'confirmPin'], properties: { currentPin: { type: 'string', pattern: '^[0-9]{4,6}$', description: 'Required when replacing an existing PIN' }, pin: { type: 'string', pattern: '^[0-9]{4,6}$' }, confirmPin: { type: 'string', pattern: '^[0-9]{4,6}$' } } }) }, responses: { '200': { description: 'PIN saved' }, '400': { description: 'Invalid PIN or current PIN' }, '401': { description: 'Unauthorized' }, '429': { description: 'Too many attempts' } } },
    },
    '/api/users/me': {
      get: { tags: ['Users'], summary: 'Get current profile', responses: { '200': { description: 'Profile', ...json({ $ref: '#/components/schemas/User' }) }, '401': { description: 'Unauthorized' } } },
      patch: { tags: ['Users'], summary: 'Edit name, phone, and email', requestBody: { required: true, ...json({ type: 'object', required: ['fullName', 'phone', 'email'], properties: { fullName: { type: 'string', maxLength: 150 }, phone: { type: 'string', maxLength: 20 }, email: { type: 'string', format: 'email' } } }) }, responses: { '200': { description: 'Profile updated' }, '400': { description: 'Validation or email verification error' }, '409': { description: 'Email already in use' }, '401': { description: 'Unauthorized' } } },
    },
    '/api/kyc': {
      get: { tags: ['KYC'], summary: 'Get latest KYC status', responses: { '200': { description: 'KYC status' }, '401': { description: 'Unauthorized' } } },
      post: { tags: ['KYC'], summary: 'Submit KYC consent and masked identity details', requestBody: { required: true, ...json({ type: 'object', required: ['legalName', 'governmentIdLast4', 'consent'], properties: { legalName: { type: 'string' }, dateOfBirth: { type: 'string', format: 'date' }, governmentIdLast4: { type: 'string', pattern: '^[0-9]{4}$' }, consent: { type: 'boolean' } } }) }, responses: { '201': { description: 'KYC submitted' }, '400': { description: 'Invalid KYC data or consent' }, '401': { description: 'Unauthorized' } } },
    },
    '/api/notifications': {
      get: { tags: ['Notifications'], summary: 'List notifications', responses: { '200': { description: 'Notifications', ...json({ type: 'array', items: { $ref: '#/components/schemas/Notification' } }) }, '401': { description: 'Unauthorized' } } },
      patch: { tags: ['Notifications'], summary: 'Mark a notification as read', parameters: [{ name: 'id', in: 'query', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': { description: 'Marked as read', ...json({ $ref: '#/components/schemas/Notification' }) }, '400': { description: 'Missing ID' }, '401': { description: 'Unauthorized' }, '404': { description: 'Not found' } } },
    },
    '/api/razorpay': { post: { tags: ['Razorpay'], summary: 'Create a Razorpay test order', requestBody: { required: true, ...json({ type: 'object', required: ['amount'], properties: { amount: { type: 'number', description: 'Amount in INR' }, currency: { type: 'string', default: 'INR' }, receipt: { type: 'string' } } }) }, responses: { '200': { description: 'Order created' }, '400': { description: 'Invalid amount' }, '401': { description: 'Unauthorized' } } } },
    '/api/razorpay/verify': { post: { tags: ['Razorpay'], summary: 'Verify a Razorpay test payment', requestBody: { required: true, ...json({ type: 'object', required: ['razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature'], properties: { razorpay_order_id: { type: 'string' }, razorpay_payment_id: { type: 'string' }, razorpay_signature: { type: 'string' }, amount: { type: 'number' } } }) }, responses: { '200': { description: 'Payment verified' }, '400': { description: 'Invalid signature' }, '401': { description: 'Unauthorized' } } } },
  },
}

export async function GET() {
  return NextResponse.json(spec, { headers: { 'Content-Type': 'application/json' } })
}
