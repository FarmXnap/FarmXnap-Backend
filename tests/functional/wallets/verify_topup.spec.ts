import { test } from '@japa/runner'
import nock from 'nock'
import {
  convertAmountToMinorUnit,
  generatePaymentReference,
  PaymentProvidersEnum,
  paystackBaseUrl,
} from '#helpers/payment_helper'
import db from '@adonisjs/lucid/services/db'
import { UserFactory } from '#database/factories/user_factory'
import { generateLoginToken } from '#helpers/test_helper'
import { WalletOwnerTypesEnum } from '#models/wallet'
import { WalletFactory } from '#database/factories/wallet_factory'
import { PaymentProviderVerifyTransactionResponse } from '#types/payment'
import Transaction, {
  TransactionCategoriesEnum,
  TransactionStatusesEnum,
  TransactionTypesEnum,
} from '#models/transaction'

test.group('Wallets / Topup / Verify', (group) => {
  group.each.setup(async () => {
    await db.beginGlobalTransaction()

    return () => {
      nock.cleanAll()
      return db.rollbackGlobalTransaction()
    }
  })

  test('should verify wallet topup: {$self}')
    .with([
      'main_assertion',
      'not_logged_in',
      'reference_not_provided',
      'transaction_not_found',
      'transaction_already_completed',
      'transaction_amount_mismatch',
      'no_profile',
      'no_wallet',
    ] as const)
    .run(async ({ client, route, assert }, condition) => {
      const user = await UserFactory.with('farmerProfile').apply('isFarmer').create()

      let tokenValue = ''
      if (condition !== 'not_logged_in') {
        tokenValue = await generateLoginToken({ assert, user })
      }

      await user.load('farmerProfile')

      const wallet = await WalletFactory.merge({
        owner_id: user.farmerProfile.id,
        owner_type: WalletOwnerTypesEnum.Farmer,
      }).create()

      //  Generate mock reference and pre-seed the database with a transaction
      const reference = generatePaymentReference()
      const amountInMainUnit = 5000
      const amountInMinorUnit = convertAmountToMinorUnit(amountInMainUnit)

      let transaction: Transaction | null = null
      if (condition !== 'transaction_not_found') {
        transaction = await Transaction.create({
          amount:
            condition === 'transaction_amount_mismatch'
              ? convertAmountToMinorUnit(amountInMainUnit - amountInMainUnit / 2)
              : amountInMinorUnit,
          category: TransactionCategoriesEnum.Topup,
          provider: PaymentProvidersEnum.Paystack,
          reference,
          status:
            condition === 'transaction_already_completed'
              ? TransactionStatusesEnum.Completed
              : TransactionStatusesEnum.Pending,
          wallet_id: wallet.id,
          type: TransactionTypesEnum.Credit,
        })
      }

      // Set up nock
      nock(paystackBaseUrl)
        .get(`/transaction/verify/${reference}`)
        .reply(200, {
          status: true,
          message: 'Verification successful',
          data: {
            status: 'success',
            amount: amountInMinorUnit,
            currency: 'NGN',
            reference,
            metadata: { wallet_id: wallet.id },
          } as PaymentProviderVerifyTransactionResponse['data'],
        } satisfies Partial<PaymentProviderVerifyTransactionResponse>)

      if (condition === 'no_wallet') {
        await transaction?.delete()
        await wallet.delete()
      }

      if (condition === 'no_profile') {
        await user.farmerProfile.delete()
      }

      // Enabling this will disable the interception and make a real request
      // nock.recorder.rec()

      const response = await client
        .get(
          route('api.v1.wallets.topup.verify', undefined, {
            qs: { reference: condition === 'reference_not_provided' ? '' : reference },
          })
        )
        .bearerToken(tokenValue)

      if (condition === 'not_logged_in') {
        response.assertStatus(401)

        return response.assertBodyContains({ error: 'Unauthorized access' })
      }

      if (condition === 'reference_not_provided') {
        response.assertStatus(422)

        return response.assertBodyContains({
          errors: ['Reference is required.'],
        })
      }

      if (condition === 'no_profile') {
        response.assertStatus(400)

        return response.assertBodyContains({ error: 'No profile found for the user.' })
      }

      if (condition === 'no_wallet') {
        response.assertStatus(404)

        return response.assertBodyContains({ error: 'No wallet found for the user.' })
      }

      if (condition === 'transaction_not_found') {
        response.assertStatus(404)

        return response.assertBodyContains({ error: 'Transaction not found for the reference.' })
      }

      if (condition === 'transaction_amount_mismatch') {
        response.assertStatus(400)

        return response.assertBodyContains({
          error: 'Transaction verification failed due to amount mismatch.',
        })
      }

      response.assertStatus(200)

      if (condition === 'transaction_already_completed') {
        return response.assertBodyContains({ message: 'Wallet topup already completed.' })
      }

      await transaction!.refresh()
      assert.equal(transaction!.status, TransactionStatusesEnum.Completed)

      response.assertBodyContains({
        message: `Wallet topup processed with status: ${transaction!.status}.`,

        data: {
          status: transaction!.status,
          amount: amountInMainUnit,
        },
      })
    })
    .tags(['wallets', 'topup', 'verify_topup'])
  // .timeout(30000)
})
