import type { AuthResponse } from '@/frontend/types'
import { apiRequest } from './api-client'

export interface RegisterPayload {
  email: string
  password: string
  fullName: string
  phone: string
}

export interface LoginPayload {
  email: string
  password: string
}

export const authService = {
  // POST /api/auth/register  — handled by app/api/auth/register/route.ts
  register: (payload: RegisterPayload) =>
    apiRequest<AuthResponse>({ url: '/auth/register', method: 'POST', data: payload }),
  // POST /api/auth/login  — handled by app/api/auth/login/route.ts
  login: (payload: LoginPayload) =>
    apiRequest<AuthResponse>({ url: '/auth/login', method: 'POST', data: payload }),
  // POST /api/auth/refresh — not needed (Supabase handles this via api-client)
  refresh: (refreshToken: string) =>
    apiRequest<AuthResponse>({ url: '/auth/refresh', method: 'POST', data: { refreshToken } }),
  // POST /api/auth/sync — handled by app/api/auth/sync/route.ts
  sync: () => apiRequest<AuthResponse>({ url: '/auth/sync', method: 'POST' }),
}
