import { randomInt } from 'node:crypto'

export function generateOtp() {
  return randomInt(/**6 digits**/ 100_000, 1_000_000).toString()
}

export const nairaISOCode = '566'

export const callbackUrl = 'https://farmxnap.com/api/v1/payments/callback'
