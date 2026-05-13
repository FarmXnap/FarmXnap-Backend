import { paystackBaseUrl } from '#helpers/payment_helper'
import env from '#start/env'
import BasePaymentService from './base_payment_service.js'

export default class PaystackProvider extends BasePaymentService {
  protected providerName: string = 'Paystack'

  #baseUrl: string = paystackBaseUrl

  protected getBanksEndpoint: string = `${this.#baseUrl}/bank?country=nigeria`

  protected secretKey: string = env.get('PAYSTACK_SECRET_KEY')

  protected resolveVerifyBankAccountEndpoint(bankCode: string, bankAccountNumber: string): string {
    return `${this.#baseUrl}/bank/resolve?account_number=${bankAccountNumber}&bank_code=${bankCode}`
  }
}
