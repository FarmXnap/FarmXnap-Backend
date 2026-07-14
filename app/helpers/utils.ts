import { randomInt } from 'node:crypto'

export function generateOtp() {
  return randomInt(/**6 digits**/ 100_000, 1_000_000).toString()
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
