/** Shared types matching the Next.js API routes and Supabase schema. */

export type TransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED'
export type UserRole = 'USER' | 'ADMIN'

export interface User {
  id: string
  email: string
  fullName: string
  phone: string | null
  upiId: string | null
  role: UserRole
  kycVerified: boolean
  kycStatus?: 'NOT_STARTED' | 'SUBMITTED' | 'IN_REVIEW' | 'VERIFIED' | 'REJECTED'
  pendingEmail?: string | null
  createdAt: string
}

export interface BankAccount {
  id: string
  userId: string
  accountNumber: string
  ifscCode: string
  bankName: string
  accountHolderName: string
  upiId: string | null
  upiName: string | null
  upiNumber: string | null
  balance: number | null
  primary: boolean
  createdAt: string
}

export interface AddBankAccountPayload {
  accountNumber: string
  ifscCode: string
  bankName: string
  accountHolderName: string
  upiName?: string
  upiNumber?: string
  makePrimary?: boolean
}

export interface Transaction {
  id: string
  transactionRef: string
  senderId: string
  receiverId: string
  senderUpiId: string
  receiverUpiId: string
  amount: number
  remark: string | null
  status: TransactionStatus
  createdAt: string
  completedAt: string | null
}

export interface Notification {
  id: string
  title: string
  message: string
  type: string
  read: boolean
  createdAt: string
}

export interface AuthResponse {
  accessToken: string | null
  refreshToken: string | null
  tokenType: string
  expiresIn: number
  user: User
}

export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface DashboardResponse {
  availableBalance: number | null
  monthlySpending: number | null
  monthlyIncome: number | null
  totalTransactions: number
  unreadNotifications: number
}

export interface BalanceResponse {
  availableBalance: number
  accounts: Array<{ id: string; bankName: string; accountNumber: string; balance: number; primary: boolean }>
  expiresAt: string
}

export interface PinStatus { configured: boolean }

export interface UpdateProfileResponse {
  user: User
  emailChangePending: boolean
}

export interface KycVerification {
  id: string
  status: 'SUBMITTED' | 'IN_REVIEW' | 'VERIFIED' | 'REJECTED'
  provider: string
  externalReference: string
  legalName: string
  governmentIdLast4: string | null
  submittedAt: string
  reviewedAt: string | null
  rejectionReason: string | null
}

export interface ApiError {
  timestamp?: string
  status?: number
  error?: string
  message?: string
  path?: string
}

export interface GenerateQrResponse {
  upiId: string
  upiName?: string
  upiNumber?: string | null
  bankAccountId?: string | null
  payload: string
  format: string
}
