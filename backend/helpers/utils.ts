import env from '#start/env'
import { randomInt } from 'node:crypto'

export function generateOtp() {
  return randomInt(/**6 digits**/ 100_000, 1_000_000).toString()
}

export const nairaISOCode = '566'

const appUrl =
  env.get('NODE_ENV') === 'production'
    ? 'https://farmxnap.onrender.com'
    : `http://localhost:${env.get('PORT')}`

export const callbackUrl = `${appUrl}/api/v1/payments/callback`

export const interswitchInquiryBaseUrl =
  env.get('NODE_ENV') === 'production'
    ? 'https://webpay.interswitchng.com'
    : 'https://qa.interswitchng.com'

export const interswitchBankListAndVerificationBaseUrl =
  env.get('NODE_ENV') === 'production'
    ? `https://api.interswitchng.com/marketplace-routing`
    : `https://api-marketplace-routing.k8.isw.la`
