import type { KycVerification } from '@/frontend/types'
import { apiRequest } from './api-client'

export const kycService = {
  status: () => apiRequest<KycVerification | null>({ url: '/kyc', method: 'GET' }),
  submit: (data: { legalName: string; dateOfBirth?: string; governmentIdLast4: string; consent: boolean }) => apiRequest<KycVerification>({ url: '/kyc', method: 'POST', data }),
}
