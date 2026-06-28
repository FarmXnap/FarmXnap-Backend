import type { HttpContext } from '@adonisjs/core/http'
import { schema } from '@adonisjs/validator'
import BasePaymentService from '#services/payments/base_payment_service'
import { inject } from '@adonisjs/core'
import { appUrl } from '#config/app'
import { convertAmountToMainUnit, convertAmountToMinorUnit } from '#helpers/payment_helper'
import db from '@adonisjs/lucid/services/db'
import Transaction, {
  TransactionCategoriesEnum,
  TransactionStatusesEnum,
  TransactionTypesEnum,
} from '#models/transaction'
import { randomBytes } from 'node:crypto'
import { rules } from '#helpers/validator_rules'
import Wallet from '#models/wallet'
import app from '@adonisjs/core/services/app'

@inject()
export default class WalletsController {
  constructor(protected paymentService: BasePaymentService) {}

  /**
   * Initialize wallet topup.
   *
   * `POST /api/v1/wallets/topup/initialize`
   */
  public async initializeTopup({ request, response, auth }: HttpContext) {
    const user = auth.user!

    const { amount: amountInMainUnit } = await request.validate({
      schema: schema.create({
        amount: schema.number(),
      }),
      messages: {
        'amount.required': 'Amount is required.',
        'amount.number': 'Amount must be a number.',
      },
    })

    await Promise.all([user.load('farmerProfile'), user.load('agroDealerProfile')])

    const ownerId = user.farmerProfile?.id || user.agroDealerProfile?.id

    if (!ownerId) {
      return response.badRequest({ error: 'No profile found for the user.' })
    }

    const walletId = (await Wallet.query().select('id').where('owner_id', ownerId).first())?.id

    if (!walletId) {
      return response.notFound({ error: 'No wallet found for the user.' })
    }

    const email =
      user.email ||
      `${user.role}.${user.phone_number}@${app.inTest || app.inDev ? 'localhost.com' : new URL(appUrl).hostname}`

    const ref = `FXP-${randomBytes(4).toString('hex').toUpperCase()}-${Date.now()}`

    const amountInMinorUnit = convertAmountToMinorUnit(amountInMainUnit)

    const transaction = await Transaction.create({
      category: TransactionCategoriesEnum.Topup,
      type: TransactionTypesEnum.Credit,
      status: TransactionStatusesEnum.Pending,
      reference: ref,
      wallet_id: walletId,
      amount: amountInMinorUnit,
    })

    const { data, paymentProviderName } = await this.paymentService.initializeWalletTopup({
      email,
      amount: amountInMinorUnit,
      walletId,
      reference: ref,
    })

    await transaction.merge({ provider: paymentProviderName }).save()

    const { access_code: accessCode, authorization_url: authorizationUrl, reference } = data

    return response.ok({
      message: 'Wallet topup initialized successfully.',
      data: {
        access_code: accessCode,
        authorization_url: authorizationUrl,
        reference,
      },
    })
  }

  /**
   * Verify wallet topup.
   *
   * `GET /api/v1/wallets/topup/verify`
   */
  public async verifyTopup({ request, response, auth, logger }: HttpContext) {
    const user = auth.user!

    const { reference } = await request.validate({
      schema: schema.create({
        reference: schema.string([rules.trim(), rules.stripTags()]),
      }),
      messages: {
        'reference.required': 'Reference is required.',
      },
      data: request.qs(),
    })

    await Promise.all([user.load('farmerProfile'), user.load('agroDealerProfile')])

    const ownerId = user.farmerProfile?.id || user.agroDealerProfile?.id

    if (!ownerId) {
      return response.badRequest({ error: 'No profile found for the user.' })
    }

    const wallet = await Wallet.query()
      .select(['id', 'balance'])
      .where({ owner_id: ownerId })
      .first()

    if (!wallet) {
      return response.notFound({ error: 'No wallet found for the user.' })
    }

    const { response: providerResponse, paymentProviderName } =
      await this.paymentService.verifyWalletTopup({
        reference,
      })

    const result = await db.transaction(async (trx) => {
      const transaction = await Transaction.query({ client: trx })
        .select(['id', 'reference', 'status', 'amount'])
        .where({ reference })
        .forUpdate() // Lock row to prevent race conditions
        .first()

      if (!transaction) {
        const errorMessage = 'Transaction not found for the reference.'

        logger.error(
          { paymentProviderName, reference },
          `[WalletsController.verifyTopup -> ${paymentProviderName}] ${errorMessage}`
        )

        return { errorMessage, statusCode: 404 }
      }

      // Ensure this operation is idempotent
      if (transaction.status === TransactionStatusesEnum.Completed) {
        return { successMessage: 'Wallet topup already completed.', statusCode: 200 }
      }

      const providerResponseAmount = Number(providerResponse.data.amount)
      const expectedAmount = Number(transaction.amount)

      if (providerResponseAmount !== expectedAmount) {
        logger.error(
          { paymentProviderName, providerResponseAmount, expectedAmount, reference },
          `[WalletsController.verifyTopup -> ${paymentProviderName}] Amount mismatch detected!`
        )

        return {
          errorMessage: 'Transaction verification failed due to amount mismatch.',
          statusCode: 400,
        }
      }

      const providerResponseDataStatus = providerResponse.data.status

      if (providerResponseDataStatus === 'success') {
        await transaction
          .useTransaction(trx)
          .merge({ status: TransactionStatusesEnum.Completed })
          .save()

        // await wallet
        //   .useTransaction(trx)
        //   // // Lock row to prevent race conditions
        //   .lockForUpdate(async (freshWalletInstance) => {
        //     await freshWalletInstance
        //       .merge({ balance: Number(freshWalletInstance.balance) + expectedAmount })
        //       .save()
        //   })
        // OR

        // The db `increment` automatically handles row-level write lock on the wallet
        await trx.from('wallets').where({ id: wallet.id }).increment('balance', expectedAmount)

        logger.info(
          { paymentProviderName, reference, walletId: wallet.id, amount: expectedAmount },
          '[WalletsController.verifyTopup] Wallet credited successfully via verification endpoint.'
        )

        /**@todo: try catch here */
      } else {
        /**
         * CRITICAL: Do not explicitly mark the transaction as failed even if the provider response is 'failed'.
         * Because the provider may allow for retry on the interface.
         *
         * Use a background job to mark as failed any transaction that
         * is pending for more than 24 hours.
         */
        /**
         * @todo
         */
        logger.warn(
          {
            paymentProviderName,
            reference,
            walletId: wallet.id,
            amount: expectedAmount,
            providerResponseDataStatus,
          },
          '[WalletsController.verifyTopup] Transaction not successful yet.'
        )
      }

      await transaction.refresh()

      return transaction
    })

    if ('errorMessage' in result) {
      return response.status(result.statusCode).json({ error: result.errorMessage })
    }

    if ('successMessage' in result) {
      return response.status(result.statusCode).json({ message: result.successMessage })
    }

    const transaction = result

    return response.ok({
      message: `Wallet topup processed with status: ${transaction.status}.`,
      data: {
        status: transaction.status,
        amount: convertAmountToMainUnit(Number(transaction.amount)),
      },
    })
  }
}
