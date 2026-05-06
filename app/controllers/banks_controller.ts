import type { HttpContext } from '@adonisjs/core/http'
import BankService from '#services/bank_service'
import { rules } from '#helpers/validator_rules'
import { schema } from '@adonisjs/validator'

export default class BanksController {
  /**
   * List banks.
   *
   * `GET /api/v1/banks`
   */
  public async index({ response }: HttpContext) {
    return response.ok({ data: await BankService.getBanks() })
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

    const verification = await BankService.verifyBankAccount(bankCode, bankAccountNumber)

    if (typeof verification === 'string') {
      return response.badGateway({ error: verification })
    }

    if (typeof verification === 'object' && 'errorCode' in verification) {
      if (verification.errorCode === 422) {
        return response.unprocessableEntity({ errors: [verification.message] })
      }
      return response.internalServerError({ error: verification.message })
    }

    return response.ok({
      data: {
        account_name: verification.account_name,
        account_number: verification.account_number,
      },
    })
  }
}
