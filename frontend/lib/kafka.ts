/**
 * Kafka event publisher using an HTTP REST proxy.
 *
 * This works with Aiven/Karapace Kafka REST and keeps the Next.js API
 * serverless-friendly. If it is not configured, events are logged and the
 * payment request continues normally.
 */

export type PaymentEvent = {
  type: 'PAYMENT_INITIATED' | 'PAYMENT_SUCCESS' | 'PAYMENT_FAILED' | 'USER_REGISTERED'
  timestamp: string
  data: Record<string, unknown>
}

const KAFKA_URL = process.env.KAFKA_REST_URL?.replace(/\/+$/, '')
const KAFKA_USER = process.env.KAFKA_USERNAME
const KAFKA_PASS = process.env.KAFKA_PASSWORD
const TOPIC = process.env.KAFKA_TOPIC || 'cloudpay-events'
const configured = Boolean(KAFKA_URL && KAFKA_USER && KAFKA_PASS)

if (!configured && process.env.NODE_ENV !== 'test') {
  console.warn('[Kafka] KAFKA_REST_URL not set — events will be logged only')
}

async function produce(topic: string, message: string) {
  if (!KAFKA_URL || !KAFKA_USER || !KAFKA_PASS) return
  const response = await fetch(`${KAFKA_URL}/topics/${encodeURIComponent(topic)}`, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.kafka.v2+json, application/json',
      'Content-Type': 'application/vnd.kafka.json.v2+json',
      Authorization: `Basic ${Buffer.from(`${KAFKA_USER}:${KAFKA_PASS}`).toString('base64')}`,
    },
    body: JSON.stringify({ records: [{ value: JSON.parse(message) }] }),
  })
  if (!response.ok) {
    throw new Error(`Kafka REST returned HTTP ${response.status}`)
  }
}

/**
 * Publish a payment event to Kafka.
 * Falls back to console.log if Kafka is not configured.
 */
export async function publishEvent(event: PaymentEvent): Promise<void> {
  const message = JSON.stringify({ ...event, timestamp: new Date().toISOString() })
  if (configured) {
    try {
      await produce(TOPIC, message)
    } catch (err) {
      // Non-fatal — log and continue
      console.error('[Kafka] Failed to publish event:', err)
      console.log('[Kafka] Event (not published):', message)
    }
  } else {
    // Dev fallback: just log the event
    console.log(`[Kafka:${event.type}]`, JSON.stringify(event.data))
  }
}

// Convenience helpers
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
