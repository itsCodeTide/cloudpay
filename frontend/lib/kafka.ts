/**
 * Event hooks kept as no-ops for the simple deployment.
 * They preserve the application API without requiring Kafka or another queue.
 */

export type PaymentEvent = {
  type: 'PAYMENT_INITIATED' | 'PAYMENT_SUCCESS' | 'PAYMENT_FAILED' | 'USER_REGISTERED'
  timestamp: string
  data: Record<string, unknown>
}

export async function publishEvent(_event: PaymentEvent): Promise<void> {
  // Deliberately disabled for the single-service deployment.
}

export const kafkaEvents = {
  userRegistered: (userId: string, email: string, upiId: string) =>
    publishEvent({ type: 'USER_REGISTERED', timestamp: '', data: { userId, email, upiId } }),

  paymentInitiated: (ref: string, senderUpiId: string, receiverUpiId: string, amount: number) =>
    publishEvent({ type: 'PAYMENT_INITIATED', timestamp: '', data: { ref, senderUpiId, receiverUpiId, amount } }),

  paymentSuccess: (ref: string, senderUpiId: string, receiverUpiId: string, amount: number) =>
    publishEvent({ type: 'PAYMENT_SUCCESS', timestamp: '', data: { ref, senderUpiId, receiverUpiId, amount } }),

  paymentFailed: (ref: string, reason: string) =>
    publishEvent({ type: 'PAYMENT_FAILED', timestamp: '', data: { ref, reason } }),
}
