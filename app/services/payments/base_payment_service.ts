import { BANK_DATA, BankData } from '#database/seeds/bank_data'
import PaymentException from '#exceptions/payment_exception'
import { naira_ISO_4217_Code, PaymentProviderName } from '#helpers/payment_helper'
import BaseService from '#services/base_service'
import redis from '@adonisjs/redis/services/main'
import { ValidationException } from '@adonisjs/validator'
import { PaymentProviderVerifyTransactionResponse } from '../../../contracts/app.js'

export default abstract class BasePaymentService extends BaseService {
  protected abstract providerName: PaymentProviderName
  protected abstract getBanksEndpoint: string
  protected abstract resolveVerifyBankAccountEndpoint(
    bankCode: string,
    bankAccountNumber: string
  ): string

  protected abstract initializeWalletTopupEndpoint: string

  protected abstract resolveVerifyWalletTopupEndpoint(reference: string): string

  protected abstract paymentCallbackUrl: string

  protected abstract secretKey: string

  get #cacheKey() {
    return `${this.providerName.toLowerCase()}:bank_list`
  }

  public async getBanks() {
    const cacheKey = this.#cacheKey
    const cached = await redis.get(cacheKey)

    /**
     * 1. Get from cache
     */
    if (cached) {
      this.logger.info(
        `[PaymentService.getBanks -> ${this.providerName}] Getting Bank List from cache.`
      )

      return JSON.parse(cached) as BankData
    }

    try {
      /**
       * 2. Get from payment provider
       */
      const response = await fetch(this.getBanksEndpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.secretKey}`,
        },
        signal: AbortSignal.timeout(5000), // Don't let a hanging upstream server block the app
      })

      const data = (await response.json().catch(() => {})) as {
        status?: boolean
        message?: string
        data?: BankData
      }

      if (data.status && Array.isArray(data.data)) {
        this.logger.info(`[PaymentService.getBanks -> ${this.providerName}] Bank List successful.`)

        // Update cache
        await redis.set(cacheKey, JSON.stringify(data.data), 'EX', 86400 /** 24 hrs */)

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
      if (error instanceof Error && error.name === 'TimeoutError') {
        this.logger.warn(
          `[PaymentService.getBanks -> ${this.providerName}] Bank List timed out. Falling back to local data.`
        )
      } else {
        this.logger.error(
          { err: error },
          `[PaymentService.getBanks -> ${this.providerName}] Bank List failed. Falling back to local data.`
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

    let response: Response
    try {
      response = await fetch(this.resolveVerifyBankAccountEndpoint(bankCode, bankAccountNumber), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.secretKey}`,
        },
        signal: AbortSignal.timeout(7000), // Verification can be slightly slower than listing
      })
    } catch (error) {
      this.logger.error({ err: error }, `[PaymentService.verifyBank -> ${this.providerName}].`)

      const isTimeoutError = error instanceof Error && error.name === 'TimeoutError'

      throw new PaymentException(
        isTimeoutError ? 'Bank Account Verification timed out.' : 'Internal server error',
        { status: isTimeoutError ? 504 : 500 }
      )
    }

    const data = (await response.json().catch(() => {})) as {
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

      throw new ValidationException(false, message)
    }

    this.logger.error(
      {
        status: response.status,
        statusText: response.statusText,
        message: data?.message,
      },
      `[PaymentService.verifyBank -> ${this.providerName}].`
    )

    throw new PaymentException(generalErrorMessage)
  }

  public async initializeWalletTopup({
    email,
    amount,
    walletId,
    reference,
  }: {
    email: string
    amount: number
    walletId: string
    reference: string
  }) {
    let response: Response
    try {
      response = await fetch(this.initializeWalletTopupEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.secretKey}`,
        },
        body: JSON.stringify({
          email,
          amount,
          currency: naira_ISO_4217_Code,
          channels: ['card', 'bank', 'ussd', 'bank_transfer'],
          reference,
          callback_url: this.paymentCallbackUrl,
          metadata: {
            wallet_id: walletId,
          },
        }),
        signal: AbortSignal.timeout(10000),
      })
    } catch (error) {
      this.logger.error(
        { err: error },
        `[PaymentService.initializeWalletTopup -> ${this.providerName}].`
      )

      const isTimeoutError = error instanceof Error && error.name === 'TimeoutError'

      throw new PaymentException(
        isTimeoutError ? 'Wallet Topup Initialization timed out.' : 'Internal server error',
        { status: isTimeoutError ? 504 : 500 }
      )
    }

    const data = (await response.json().catch(() => {})) as {
      status?: boolean
      message?: string
      data?: {
        authorization_url: string
        access_code: string
        reference: string
      }
    }

    if (!data.status || !data.data) {
      this.logger.error(
        {
          status: response.status,
          statusText: response.statusText,
          message: data?.message,
          walletId,
        },
        `[PaymentService.initializeWalletTopup -> ${this.providerName}].`
      )

      throw new PaymentException('We could not initialize wallet topup. Please try again later.')
    }

    this.logger.info(
      { walletId },
      `[PaymentService.initializeWalletTopup -> ${this.providerName}] Wallet Topup initialization successful.`
    )

    return { data: data.data, paymentProviderName: this.providerName }
  }

  public async verifyWalletTopup({ reference }: { reference: string }) {
    let response: Response
    try {
      response = await fetch(this.resolveVerifyWalletTopupEndpoint(reference), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.secretKey}`,
        },
        signal: AbortSignal.timeout(10000),
      })
    } catch (error) {
      this.logger.error(
        { err: error },
        `[PaymentService.verifyWalletTopup -> ${this.providerName}].`
      )

      const isTimeoutError = error instanceof Error && error.name === 'TimeoutError'

      throw new PaymentException(
        isTimeoutError ? 'Wallet Topup Verification timed out.' : 'Internal server error',
        { status: isTimeoutError ? 504 : 500 }
      )
    }

    const data = (await response.json().catch(() => {})) as PaymentProviderVerifyTransactionResponse

    if (!data.status || !data.data) {
      this.logger.error(
        {
          status: response.status,
          statusText: response.statusText,
          message: data?.message,
          reference,
        },
        `[PaymentService.verifyWalletTopup -> ${this.providerName}].`
      )

      throw new PaymentException('We could not verify wallet topup. Please try again later.')
    }

    this.logger.info(
      { reference },
      `[PaymentService.verifyWalletTopup -> ${this.providerName}] Wallet Topup verification successful.`
    )

    return { response: data, paymentProviderName: this.providerName }
  }

  /**
   * @todo: After upgrading FarmXnap business to registered, implement Dedicated Virtual Account (DVA) for farmers.
   */
  protected async getDVAProvider() {}

  protected async generateVirtualAccount() {}
}
