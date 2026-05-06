import { BANK_DATA, BankData } from '#database/seeds/bank_data'
import env from '#start/env'
import logger from '@adonisjs/core/services/logger'
import redis from '@adonisjs/redis/services/main'
import { paystackBaseUrl } from '../../helpers/utils.js'

export default class BankService {
  static #CACHE_KEY = 'paystack:bank_list'

  public static async getBanks() {
    const cached = await redis.get(BankService.#CACHE_KEY)

    /**
     * 1. Get from cache
     */
    if (cached) {
      logger.info('[BankService.getBanks] Getting Bank List from cache.')

      return JSON.parse(cached) as BankData
    }

    try {
      /**
       * 2. Get from PayStack
       */
      const response = await fetch(`${paystackBaseUrl}/bank?country=nigeria`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.get('PAYSTACK_SECRET_KEY')}`,
        },
        signal: AbortSignal.timeout(5000), // Don't let a hanging PayStack server block the app
      })

      const data = (await response.json()) as {
        status?: boolean
        message?: string
        data?: BankData
      }

      if (data.status && Array.isArray(data.data)) {
        logger.info('[BankService.getBanks] PayStack Bank List successful.')

        // Update cache
        await redis.set(
          BankService.#CACHE_KEY,
          JSON.stringify(data.data),
          'EX',
          86400 /** 24 hrs */
        )

        return data.data
      }

      logger.warn(
        {
          status: response.status,
          statusText: response.statusText,
        },
        '[BankService.getBanks] PayStack Bank List unsuccessful. Falling back to local data.'
      )
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          logger.warn(
            '[BankService.getBanks] PayStack Bank List timed out. Falling back to local data.'
          )
        } else {
          logger.error(
            { err: error },
            '[BankService.getBanks] PayStack Bank List failed. Falling back to local data.'
          )
        }
      } else {
        // Handle any weird case where something was thrown that isn't an Error object
        logger.error(
          { err: error },
          '[BankService.getBanks] An unexpected error occurred. Falling back to local data.'
        )
      }
    }

    /**
     * 3. Get from local fallback
     */
    return BANK_DATA
  }

  public static async verifyBankAccount(bankCode: string, bankAccountNumber: string) {
    const generalErrorMessage = 'We could not verify your bank account. Please try again later.'

    try {
      const response = await fetch(
        `${paystackBaseUrl}/bank/resolve?account_number=${bankAccountNumber}&bank_code=${bankCode}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.get('PAYSTACK_SECRET_KEY')}`,
          },
          signal: AbortSignal.timeout(7000), // Verification can be slightly slower than listing
        }
      )

      const data = (await response.json()) as {
        status?: boolean
        message?: string
        data?: { account_number: string; account_name: string; bank_id: number }
      }

      if (data.status && data.data) {
        logger.info('[BankService.verifyBank] PayStack Bank Account Verification successful.')

        return data.data
      }

      if (response.status === 422) {
        const message =
          'Bank Account Verification failed. Ensure the account number and bank are correct.'

        logger.warn({ bankCode, bankAccountNumber }, `[BankService.verifyBank] ${message}`)

        return {
          errorCode: response.status,
          message,
        }
      }

      if (response.status === 401) {
        logger.error(
          {
            statusText: response.statusText,
            message: data.message,
          },
          '[BankService.verifyBank] PayStack Bank Account Verification unauthorized.'
        )

        return {
          errorCode: response.status,
          message: 'Unauthorized or Invalid authorization',
        }
      }

      logger.warn(
        {
          status: response.status,
          statusText: response.statusText,
        },
        '[BankService.verifyBank] PayStack Bank Account Verification unsuccessful.'
      )

      return generalErrorMessage
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          logger.warn('[BankService.verifyBank] PayStack Bank Account Verification timed out.')
        } else {
          logger.error(
            { err: error },
            '[BankService.verifyBank] PayStack Bank Account Verification failed.'
          )
        }
      } else {
        // Handle any weird case where something was thrown that isn't an Error object
        logger.error({ err: error }, '[BankService.verifyBank] An unexpected error occurred.')
      }

      return generalErrorMessage
    }
  }
}
