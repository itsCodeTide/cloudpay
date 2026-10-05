/**
 * Razorpay payment service
 * Handles order creation and payment initiation with Razorpay checkout
 */

export interface RazorpayOrderResult {
  orderId: string
  paymentId?: string
  signature?: string
  demo?: boolean
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise(resolve => {
    if (typeof window === 'undefined') return resolve(false)
    if ((window as unknown as Record<string, unknown>).Razorpay) return resolve(true)
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export async function createRazorpayOrder(amount: number, receipt?: string) {
  const res = await fetch('/api/razorpay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, receipt }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? 'Failed to create payment order')
  }
  return res.json() as Promise<{ id: string; amount: number; currency: string; key: string; demo?: boolean }>
}

export async function verifyRazorpayPayment(
  razorpay_order_id: string,
  razorpay_payment_id: string,
  razorpay_signature: string
) {
  const res = await fetch('/api/razorpay', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ razorpay_order_id, razorpay_payment_id, razorpay_signature }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? 'Payment verification failed')
  }
  return res.json() as Promise<{ verified: boolean; paymentId: string; demo?: boolean }>
}

export async function initiateRazorpayPayment(
  amount: number,
  userInfo: { name: string; email: string; contact?: string },
  description: string,
  onSuccess: (result: RazorpayOrderResult) => void,
  onFailure: (error: string) => void
): Promise<void> {
  const loaded = await loadRazorpayScript()
  if (!loaded) {
    onFailure('Failed to load Razorpay SDK. Check your internet connection.')
    return
  }

  try {
    const order = await createRazorpayOrder(amount)

    // Demo mode — skip Razorpay modal
    if (order.demo) {
      onSuccess({ orderId: order.id, paymentId: `pay_demo_${Date.now()}`, demo: true })
      return
    }

    const RazorpayConstructor = (window as unknown as Record<string, unknown>).Razorpay as new (options: unknown) => { open(): void }
    const rzp = new RazorpayConstructor({
      key: order.key,
      amount: order.amount,
      currency: order.currency,
      order_id: order.id,
      name: 'CloudPay',
      description,
      image: '/icon.svg',
      prefill: {
        name: userInfo.name,
        email: userInfo.email,
        contact: userInfo.contact ?? '',
      },
      theme: { color: '#2E86AB' },
      handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        try {
          await verifyRazorpayPayment(
            response.razorpay_order_id,
            response.razorpay_payment_id,
            response.razorpay_signature
          )
          onSuccess({
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          })
        } catch (err) {
          onFailure(err instanceof Error ? err.message : 'Payment verification failed')
        }
      },
      modal: {
        ondismiss: () => onFailure('Payment cancelled'),
      },
    })
    rzp.open()
  } catch (err) {
    onFailure(err instanceof Error ? err.message : 'Unable to initiate payment')
  }
}
