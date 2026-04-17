import { BANK_DATA, BankData } from '#database/seeds/bank_data'
import env from '#start/env'
import logger from '@adonisjs/core/services/logger'
import redis from '@adonisjs/redis/services/main'

export default class BankService {
  static #CACHE_KEY = 'paystack:bank_list'

  public static async getBanks() {
    const cached = await redis.get(BankService.#CACHE_KEY)

    /**
     * 1. Get from cache
     */
    if (cached) {
      logger.info('[BankService.getBanks] Getting Bank List from cache.')

      return JSON.parse(cached)
    }

    try {
      /**
       * 2. Get from PayStack
       */
      const response = await fetch('https://api.paystack.co/bank?country=nigeria', {
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
      } else {
        logger.warn(
          {
            status: response.status,
            statusText: response.statusText,
          },
          '[BankService.getBanks] PayStack Bank List unsuccessful. Falling back to local data.'
        )
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          logger.warn(
            '[BankService.getBanks] PayStack Bank List timed out. Falling back to local data.'
          )
        } else {
          logger.error(
            { error },
            '[BankService.getBanks] PayStack Bank List failed. Falling back to local data.'
          )
        }
      } else {
        // Handle any weird case where something was thrown that isn't an Error object
        logger.error(
          { error },
          '[BankService.getBanks] An unexpected error occurred. alling back to local data.'
        )
      }
    }

    /**
     * 3. Get from local fallback
     */
    return BANK_DATA
  }
}
