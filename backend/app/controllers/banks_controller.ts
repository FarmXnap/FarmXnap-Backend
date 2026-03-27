import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import { BANK_DATA, BankData, BankVerificationData } from '#database/seeds/bank_data'
import { interswitchBankListAndVerificationBaseUrl } from '../../helpers/utils.js'
import logger from '@adonisjs/core/services/logger'

export default class BanksController {
  /**
   * List banks.
   *
   * `GET /api/v1/banks`
   *
   * Provide fallback data in case of InterSwtich API failure:
   * - No live keys currently available
   */
  public async index({ response }: HttpContext) {
    let bankListResponse: Response | null = null

    try {
      bankListResponse = await fetch(
        `${interswitchBankListAndVerificationBaseUrl}/marketplace-routing/api/v1/verify/identity/account-number/bank-list`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.get('INTERSWITCH_TOKEN')}`,
          },
          signal: AbortSignal.timeout(5000), // Don't let a hanging Interswitch server block the app
        }
      )

      const contentType = bankListResponse.headers.get('content-type')

      if (bankListResponse.ok && contentType?.includes('application/json')) {
        const banksList = (await bankListResponse?.json()) as {
          code?: string
          message?: string
          data?: BankData
        }

        if (banksList?.code === '200' && Array.isArray(banksList?.data) && banksList.data.length) {
          logger.info('InterSwitch Bank List successful.')

          return response.ok({ data: banksList.data })
        }
      } else {
        logger.warn(
          {
            status: bankListResponse?.status,
            statusText: bankListResponse?.statusText,
          },
          'InterSwitch Bank List unsuccessful. Falling back to local data.'
        )
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        logger.warn('Interswitch Bank List timed out. Falling back to local data.')
      } else {
        logger.error({ error }, 'Interswitch Bank List failed. Falling back to local data.')
      }
    }

    return response.ok({ data: BANK_DATA })
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
