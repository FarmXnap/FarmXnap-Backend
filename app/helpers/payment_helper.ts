import { appUrl } from '#config/app'
import env from '#start/env'

export const nairaISOCode = '566'

export const naira_ISO_4217_Code = 'NGN'

export const callbackUrl = `${appUrl}/api/v1/payments/callback`

export const interswitchInquiryBaseUrl =
  env.get('NODE_ENV') === 'production'
    ? 'https://webpay.interswitchng.com'
    : 'https://qa.interswitchng.com'

export const paystackBaseUrl = 'https://api.paystack.co'

export function convertAmountToMinorUnit(amount: number) {
  return amount * 100
}

export function convertAmountToMainUnit(amount: number) {
  return amount / 100
}

export const PaymentProvidersEnum = {
  Paystack: 'paystack',
  Flutterwave: 'flutterwave',
} as const

export const paymentProviders = Object.values(PaymentProvidersEnum)

export type PaymentProviderName = (typeof PaymentProvidersEnum)[keyof typeof PaymentProvidersEnum]
