// Compatibility endpoint for API clients and Swagger. The canonical browser flow
// uses PUT /api/razorpay; both paths execute the same signature verification.
export { PUT as POST } from '@/app/api/razorpay/route'
