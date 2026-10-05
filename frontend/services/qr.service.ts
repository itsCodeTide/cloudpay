import type { GenerateQrResponse, Transaction } from '@/frontend/types'
import { apiRequest } from './api-client'

export const qrService = {
  // GET /api/qr/generate — handled by app/api/qr/generate/route.ts
  generate: (accountId?: string) => apiRequest<GenerateQrResponse>({ url: '/qr/generate', method: 'GET', params: accountId ? { accountId } : undefined }),
  // POST /api/qr/pay — handled by app/api/qr/pay/route.ts
  pay: (payload: string, amount: number, remark?: string, pin?: string, sourceBankAccountId?: string) =>
    apiRequest<Transaction>({ url: '/qr/pay', method: 'POST', data: { payload, amount, remark, pin, sourceBankAccountId } }),
}
