import { appUrl } from '#config/app'
import env from '#start/env'

export const nairaISOCode = '566'

export const callbackUrl = `${appUrl}/api/v1/payments/callback`

export const interswitchInquiryBaseUrl =
  env.get('NODE_ENV') === 'production'
    ? 'https://webpay.interswitchng.com'
    : 'https://qa.interswitchng.com'

export const paystackBaseUrl = 'https://api.paystack.co'
