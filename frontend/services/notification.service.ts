import type { Notification } from '@/frontend/types'
import { apiRequest } from './api-client'

export const notificationService = {
  list: () => apiRequest<Notification[]>({ url: '/notifications', method: 'GET' }),
  markRead: (id: string) => apiRequest<void>({ url: `/notifications?id=${encodeURIComponent(id)}`, method: 'PATCH' }),
}
