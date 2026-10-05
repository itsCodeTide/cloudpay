import crypto from 'crypto'
import bcrypt from 'bcryptjs'

export function hashTransactionPin(pin: string) {
  // BCrypt is compatible with the Spring Boot API and never stores the PIN itself.
  return bcrypt.hashSync(pin, 12)
}

export function verifyTransactionPin(pin: string, encoded: string | null | undefined) {
  if (encoded?.startsWith('$2')) return bcrypt.compareSync(pin, encoded)
  if (!encoded?.startsWith('scrypt$')) return false
  const [, salt, expected] = encoded.split('$')
  if (!salt || !expected) return false
  const actual = crypto.scryptSync(pin, salt, 32)
  const expectedBuffer = Buffer.from(expected, 'hex')
  return actual.length === expectedBuffer.length && crypto.timingSafeEqual(actual, expectedBuffer)
}
