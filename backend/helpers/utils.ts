import env from '#start/env'
import { randomInt } from 'node:crypto'

export function generateOtp() {
  return randomInt(/**6 digits**/ 100_000, 1_000_000).toString()
}

export const interswitchBankListAndVerificationBaseUrl =
  env.get('NODE_ENV') === 'production'
    ? `https://api.interswitchng.com/marketplace-routing`
    : `https://api-marketplace-routing.k8.isw.la`
