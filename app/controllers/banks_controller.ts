import type { HttpContext } from '@adonisjs/core/http'
import { rules } from '#helpers/validator_rules'
import { schema } from '@adonisjs/validator'
import { inject } from '@adonisjs/core'
import BasePaymentService from '#services/payments/base_payment_service'

@inject()
export default class BanksController {
  constructor(protected paymentService: BasePaymentService) {}

  /**
   * List banks.
   *
   * `GET /api/v1/banks`
   */
  public async index({ response }: HttpContext) {
    return response.ok({ data: await this.paymentService.getBanks() })
  }

  /**
   * Verify bank account.
   *
   * `POST /api/v1/banks/verify`
   */
  public async verify({ request, response }: HttpContext) {
    const stringRules = [rules.trim(), rules.stripTags()]

    const { bank_code: bankCode, bank_account_number: bankAccountNumber } = await request.validate({
      schema: schema.create({
        bank_code: schema.string(stringRules),
        bank_account_number: schema.string([
          ...stringRules,
          rules.minLength(10),
          rules.maxLength(10),
        ]),
      }),
      messages: {
        'bank_code.required': 'Bank Code is required.',
        'bank_account_number.required': 'Bank Account Number is required.',
        'bank_account_number.minLength': 'Bank Account Number must be 10 digits.',
        'bank_account_number.maxLength': 'Bank Account Number must be 10 digits.',
      },
    })

    const verification = await this.paymentService.verifyBankAccount(bankCode, bankAccountNumber)

    return response.ok({
      data: {
        account_name: verification.account_name,
        account_number: verification.account_number,
      },
    })
  }
}
