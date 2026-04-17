import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import { BankVerificationData } from '#database/seeds/bank_data'
import { interswitchBankListAndVerificationBaseUrl } from '../../helpers/utils.js'
import logger from '@adonisjs/core/services/logger'
import BankService from '#services/bank_service'

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
   * Verify a bank account with InterSwitch
   */
  static async verify(bankCode: string, bankAccountNumber: string) {
    let response: Response | null = null

    try {
      response = await fetch(
        `${interswitchBankListAndVerificationBaseUrl}/marketplace-routing/api/v1/verify/identity/account-number/resolve`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.get('INTERSWITCH_TOKEN')}`,
          },
          body: JSON.stringify({ accountNumber: bankAccountNumber, bankCode }),
          signal: AbortSignal.timeout(7000), // Verification can be slightly slower than listing
        }
      )

      const contentType = response.headers.get('content-type')

      if (response.ok && contentType?.includes('application/json')) {
        const result = (await response.json()) as BankVerificationData

        if (result?.success && result?.data?.bankDetails?.accountName) {
          logger.info('InterSwitch Bank Verification successful.')

          return {
            accountName: result.data.bankDetails.accountName,
            bankName: result.data.bankDetails.bankName,
          }
        }
      } else {
        logger.warn(
          {
            status: response?.status,
            statusText: response?.statusText,
          },
          'InterSwitch Bank Verification unsuccessful.'
        )
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        logger.warn('Interswitch Bank Verification timed out.')
      } else {
        logger.error({ error }, 'Interswitch Bank Verification failed.')
      }
    }

    return null // Return null if anything goes wrong
  }
}
