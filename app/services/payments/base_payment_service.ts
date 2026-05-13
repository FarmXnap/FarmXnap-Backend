import { BANK_DATA, BankData } from '#database/seeds/bank_data'
import BaseService from '#services/base_service'
import redis from '@adonisjs/redis/services/main'

export default abstract class BasePaymentService extends BaseService {
  protected abstract providerName: string
  protected abstract getBanksEndpoint: string
  protected abstract resolveVerifyBankAccountEndpoint(
    bankCode: string,
    bankAccountNumber: string
  ): string

  protected abstract secretKey: string

  protected get cacheKey() {
    return `${this.providerName.toLowerCase()}:bank_list`
  }

  public async getBanks() {
    const cached = await redis.get(this.cacheKey)

    /**
     * 1. Get from cache
     */
    if (cached) {
      this.logger.info(
        '[PaymentService.getBanks -> ${this.providerName}] Getting Bank List from cache.'
      )

      return JSON.parse(cached) as BankData
    }

    try {
      /**
       * 2. Get from provider
       */
      const response = await fetch(this.getBanksEndpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.secretKey}`,
        },
        signal: AbortSignal.timeout(5000), // Don't let a hanging upstream server block the app
      })

      const data = (await response.json()) as {
        status?: boolean
        message?: string
        data?: BankData
      }

      if (data.status && Array.isArray(data.data)) {
        this.logger.info(`[PaymentService.getBanks -> ${this.providerName}] Bank List successful.`)

        // Update cache
        await redis.set(this.cacheKey, JSON.stringify(data.data), 'EX', 86400 /** 24 hrs */)

        return data.data
      }

      this.logger.warn(
        {
          status: response.status,
          statusText: response.statusText,
        },
        `[PaymentService.getBanks -> ${this.providerName}] Bank List unsuccessful. Falling back to local data.`
      )
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          this.logger.warn(
            `[PaymentService.getBanks -> ${this.providerName}] Bank List timed out. Falling back to local data.`
          )
        } else {
          this.logger.error(
            { err: error },
            `[PaymentService.getBanks -> ${this.providerName}] Bank List failed. Falling back to local data.`
          )
        }
      } else {
        // Handle any weird case where something was thrown that isn't an Error object
        this.logger.error(
          { err: error },
          `[PaymentService.getBanks -> ${this.providerName}] An unexpected error occurred. Falling back to local data.`
        )
      }
    }

    /**
     * 3. Get from local fallback
     */
    return BANK_DATA
  }

  public async verifyBankAccount(bankCode: string, bankAccountNumber: string) {
    const generalErrorMessage = 'We could not verify your bank account. Please try again later.'

    try {
      const response = await fetch(
        this.resolveVerifyBankAccountEndpoint(bankCode, bankAccountNumber),
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.secretKey}`,
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
        this.logger.info(
          `[PaymentService.verifyBank -> ${this.providerName}] Bank Account Verification successful.`
        )

        return data.data
      }

      if (response.status === 422) {
        const message =
          'Bank Account Verification failed. Ensure the account number and bank are correct.'

        this.logger.warn(
          { bankCode, bankAccountNumber },
          `[PaymentService.verifyBank -> ${this.providerName}] ${message}`
        )

        return {
          errorCode: response.status,
          message,
        }
      }

      if (response.status === 401) {
        this.logger.error(
          {
            statusText: response.statusText,
            message: data.message,
          },
          `[PaymentService.verifyBank -> ${this.providerName}] Bank Account Verification unauthorized.`
        )

        return {
          errorCode: response.status,
          message: 'Unauthorized or Invalid authorization',
        }
      }

      this.logger.warn(
        {
          status: response.status,
          statusText: response.statusText,
        },
        `[PaymentService.verifyBank -> ${this.providerName}] Bank Account Verification unsuccessful.`
      )

      return generalErrorMessage
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          this.logger.warn(
            `[PaymentService.verifyBank -> ${this.providerName}] Bank Account Verification timed out.`
          )
        } else {
          this.logger.error(
            { err: error },
            `[PaymentService.verifyBank -> ${this.providerName}] Bank Account Verification failed.`
          )
        }
      } else {
        // Handle any weird case where something was thrown that isn't an Error object
        this.logger.error(
          { err: error },
          `[PaymentService.verifyBank -> ${this.providerName}] An unexpected error occurred.`
        )
      }

      return generalErrorMessage
    }
  }
}
