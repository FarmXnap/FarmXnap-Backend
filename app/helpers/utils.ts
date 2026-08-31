import { randomInt } from 'node:crypto'

export function generateOtp() {
  return randomInt(/**6 digits**/ 100_000, 1_000_000).toString()
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Sanitise Nigerian Phone Numbers.
 * Strips leading '+234', '234', or '0' leaving the 10-digit number.
 */
export function sanitisePhoneNumber(value: string) {
  // Remove all non-numeric characters first (spaces, dashes, plus signs)
  let cleanValue = value.replace(/\D/g, '')

  // Strip leading 234 prefix if present
  if (cleanValue.startsWith('234')) {
    cleanValue = cleanValue.slice(3)
  }

  // Strip leading 0 if present
  if (cleanValue.startsWith('0')) {
    cleanValue = cleanValue.slice(1)
  }

  return cleanValue
}
