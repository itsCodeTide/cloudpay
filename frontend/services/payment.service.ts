import type { PageResponse, Transaction } from '@/frontend/types'
import { apiRequest } from './api-client'

export interface SendMoneyPayload {
  receiverUpiId: string
  amount: number
  remark?: string
  sourceBankAccountId?: string
  pin: string
}

export const paymentService = {
  // POST /api/transactions/send — handled by app/api/transactions/send/route.ts
  send: (payload: SendMoneyPayload) =>
    apiRequest<Transaction>({ url: '/transactions/send', method: 'POST', data: payload }),
  // GET /api/transactions — handled by app/api/transactions/route.ts
  history: (page = 0, size = 20) =>
    apiRequest<PageResponse<Transaction>>({ url: '/transactions', method: 'GET', params: { page, size } }),
}
