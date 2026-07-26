import { PaymentProviderName, paystackBaseUrl } from '#helpers/payment_helper'
import env from '#start/env'
import BasePaymentService from './base_payment_service.js'

export default class PaystackProvider extends BasePaymentService {
  protected providerName: PaymentProviderName = 'paystack'

  #baseUrl: string = paystackBaseUrl

  protected getBanksEndpoint: string = `${this.#baseUrl}/bank?country=nigeria`

  protected secretKey: string = env.get('PAYSTACK_SECRET_KEY')

  protected resolveVerifyBankAccountEndpoint(bankCode: string, bankAccountNumber: string): string {
    return `${this.#baseUrl}/bank/resolve?account_number=${bankAccountNumber}&bank_code=${bankCode}`
  }

  protected initializeWalletTopupEndpoint: string = `${this.#baseUrl}/transaction/initialize`

  protected resolveVerifyWalletTopupEndpoint(reference: string): string {
    return `${this.#baseUrl}/transaction/verify/${reference}`
  }

  protected paymentCallbackUrl: string = env.get('PAYSTACK_PAYMENT_CALLBACK_URL')

  protected webhookSignatureHeaderKey: string = 'x-paystack-signature'

  protected webhookHashingAlgorithm: string = 'sha512'
}
