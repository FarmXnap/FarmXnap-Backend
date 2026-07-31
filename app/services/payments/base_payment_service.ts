import { BANK_DATA, BankData } from '#database/seeds/bank_data'
import PaymentException from '#exceptions/payment_exception'
import { naira_ISO_4217_Code, PaymentProviderName } from '#helpers/payment_helper'
import BaseService from '#services/base_service'
import redis from '@adonisjs/redis/services/main'
import { ValidationException } from '@adonisjs/validator'
import {
  PaymentProviderChargeSuccessWebhookPayload,
  PaymentProviderVerifyTransactionResponse,
} from '#types/payment'
import { HttpContext } from '@adonisjs/core/http'
import crypto from 'node:crypto'
import db from '@adonisjs/lucid/services/db'
import Transaction, { TransactionStatusesEnum } from '#models/transaction'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'

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

  protected abstract webhookSignatureHeaderKey: string

  protected abstract webhookHashingAlgorithm: string

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

  /**
   * @todo Make `initializeWalletTopup`, `verifyWalletTopup`, etc. abstract and move their implementation to the child classes. Return a unified provider-agnostic response structure from them.
   */

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
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.secretKey}`,
      }

      // Only override encoding behaviour for local debugging/testing
      if (app.inTest || app.inDev) {
        headers['accept-encoding'] = 'identity'
      }

      response = await fetch(this.initializeWalletTopupEndpoint, {
        method: 'POST',
        headers,
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
          reference,
        },
        `[PaymentService.initializeWalletTopup -> ${this.providerName}].`
      )

      throw new PaymentException('We could not initialize wallet topup. Please try again later.')
    }

    this.logger.info(
      { walletId, reference, data: data.data },
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

  public verifyWebhookSignature(request: HttpContext['request']): boolean {
    const signature = request.header(this.webhookSignatureHeaderKey)

    const rawBody = request.raw()

    if (!rawBody || !signature) {
      this.logger.error(
        `[PaymentService.verifyWebhookSignature -> ${this.providerName}] No Raw Body or Signature provided!`
      )

      return false
    }

    this.logger.info(
      { rawBody },
      `[PaymentService.verifyWebhookSignature -> ${this.providerName}] Raw Body.`
    )

    const computedHash = crypto
      .createHmac(this.webhookHashingAlgorithm, this.secretKey)
      .update(rawBody)
      .digest('hex')

    if (computedHash !== signature.toLowerCase()) {
      this.logger.error(
        `[PaymentService.verifyWebhookSignature -> ${this.providerName}] Webhook signature mismatch!`
      )

      return false
    }

    return true
  }

  public async processWebhookPayload(payload: PaymentProviderChargeSuccessWebhookPayload) {
    if (payload.event !== 'charge.success') {
      this.logger.warn(
        { payload },
        `[BasePaymentService.processWebhookPayload -> ${this.providerName}] Unkonwn webhook event received. Ignoring.`
      )
      return
    }

    const reference = payload.data.reference
    const webhookResponseAmount = Number(payload.data.amount)

    await db.transaction(async (trx) => {
      const transaction = await Transaction.query({ client: trx })
        .where({ reference })
        .forUpdate() // Lock row to prevent race conditions
        .first()

      if (!transaction) {
        return this.logger.error(
          { reference },
          `[BasePaymentService.processWebhookPayload -> ${this.providerName}] Transaction reference not found.`
        )
      }

      if (transaction.status === TransactionStatusesEnum.Completed) {
        this.logger.warn(
          { transaction: transaction.serialize() },
          `[BasePaymentService.processWebhookPayload -> ${this.providerName}] Transaction already completed.`
        )
        return
      }

      const expectedAmount = Number(transaction.amount)

      if (webhookResponseAmount !== expectedAmount) {
        this.logger.error(
          { webhookResponseAmount, expectedAmount, reference },
          `[BasePaymentService.processWebhookPayload -> ${this.providerName}] Mismatch detected between webhook amount and transaction amount!`
        )

        await transaction
          .useTransaction(trx)
          .merge({ status: TransactionStatusesEnum.Failed })
          .save()

        // Don't throw an exception to avoid job retries
        return this.logger.error(
          `[BasePaymentService.processWebhookPayload -> ${this.providerName}] Transaction aborted due to webhook amount mismatch.`
        )
      }

      if (transaction.status === TransactionStatusesEnum.Expired) {
        this.logger.warn(
          {
            transactionId: transaction.id,
            walletId: transaction.wallet_id,
            reference,
            previousStatus: transaction.status,
          },
          `[BasePaymentService.processWebhookPayload -> ${this.providerName}] Late payment received: Marking an expired transaction as completed.`
        )
      }

      await transaction
        .useTransaction(trx)
        .merge({ status: TransactionStatusesEnum.Completed })
        .save()

      // The db `increment` automatically handles row-level write lock on the wallet
      await trx
        .from('wallets')
        .where({ id: transaction.wallet_id })
        .increment('balance', expectedAmount)

      this.logger.info(
        {
          reference,
          transactionId: transaction.id,
          walletId: transaction.wallet_id,
          expectedAmount,
        },
        `[BasePaymentService.processWebhookPayload -> ${this.providerName}] Wallet balance incremented and Transaction updated successfully.`
      )
    })
  }

  /**
   * Transition stale pending transactions to expired
   */
  public async expireStaleTransactions() {
    const cutoffTime = DateTime.now().minus({ hours: 48 }).toJSDate()

    // Batch update pending transactions created 48 hours ago and over
    const updatedRows = await Transaction.query()
      .where('status', TransactionStatusesEnum.Pending)
      .where('created_at', '<=', cutoffTime)
      .update({
        status: TransactionStatusesEnum.Expired,
      })
      .returning('id')

    const count = updatedRows.length

    this.logger.info(
      {
        count,
        cutoffTime,
        // Only capture up to the first 5 IDs as a sample
        sampleIds: count ? updatedRows.slice(0, 5).map((row) => row.id) : [],
      },
      '[BasePaymentService.expireStaleTransactions] Stale transactions expired successfully.'
    )

    return count
  }

  /**
   * @todo: After upgrading FarmXnap business to registered, implement Dedicated Virtual Account (DVA) for farmers.
   */
  protected async getDVAProvider() {}

  protected async generateVirtualAccount() {}
}
