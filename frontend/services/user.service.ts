import type { BalanceResponse, DashboardResponse, PinStatus, UpdateProfileResponse, User } from '@/frontend/types'
import { apiRequest } from './api-client'

export const userService = {
  // GET /api/users/me — handled by app/api/users/me/route.ts
  me: () => apiRequest<User>({ url: '/users/me', method: 'GET' }),
  updateProfile: (data: { fullName: string; phone: string; email: string }) => apiRequest<UpdateProfileResponse>({ url: '/users/me', method: 'PATCH', data }),
  // GET /api/dashboard — handled by app/api/dashboard/route.ts
  dashboard: () => apiRequest<DashboardResponse>({ url: '/dashboard', method: 'GET' }),
  checkBalance: (pin: string) => apiRequest<BalanceResponse>({ url: '/dashboard/balance', method: 'POST', data: { pin } }),
  // POST /api/users/upi-id — handled by app/api/users/upi-id/route.ts
  generateUpi: () => apiRequest<User>({ url: '/users/upi-id', method: 'POST' }),
  pinStatus: () => apiRequest<PinStatus>({ url: '/users/transaction-pin', method: 'GET' }),
  setPin: (pin: string, confirmPin: string, currentPin?: string) => apiRequest<PinStatus>({ url: '/users/transaction-pin', method: 'POST', data: { pin, confirmPin, currentPin } }),
}
