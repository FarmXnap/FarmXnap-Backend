import { test } from '@japa/runner'
import {
  convertAmountToMinorUnit,
  generatePaymentReference,
  PaymentProvidersEnum,
} from '#helpers/payment_helper'
import env from '#start/env'
import crypto from 'node:crypto'
import { UserFactory } from '#database/factories/user_factory'
import { WalletFactory } from '#database/factories/wallet_factory'
import { WalletOwnerTypesEnum } from '#models/wallet'
import Transaction, {
  TransactionCategoriesEnum,
  TransactionStatusesEnum,
  TransactionTypesEnum,
} from '#models/transaction'
import app from '@adonisjs/core/services/app'
import QueueProvider from '#providers/queue_provider'
import { faker } from '@faker-js/faker'
import { sleep } from '#helpers/utils'
import { truncateDBTablesInTest } from '#helpers/test_helper'

test.group('Webhooks / Wallet Topup', async (group) => {
  group.each.teardown(async () => {
    // Clear existing jobs in Redis queue
    const queueProvider = await app.container.make(QueueProvider)
    await queueProvider.getQueue('payments').obliterate({ force: true })

    // Truncate the db since we are not using a global transaction (because the test runner and the background job run in separate processes)
    await truncateDBTablesInTest()
  })

  test('should handle charge.success webhook and topup wallet: {$self}')
    .with([
      'main_assertion',
      'no_signature',
      'signature_mismatch',
      'transaction_not_found',
      'transaction_amount_mismatch',
    ])
    .run(async ({ client, route, assert }, condition) => {
      const user = await UserFactory.with('farmerProfile').apply('isFarmer').create()

      await user.load('farmerProfile')

      const wallet = await WalletFactory.merge({
        owner_id: user.farmerProfile.id,
        owner_type: WalletOwnerTypesEnum.Farmer,
      }).create()

      const initialWalletAvailableBalance = wallet.balance
      const initialWalletLockedBalance = wallet.locked_balance

      //  Generate mock reference and pre-seed the database with a transaction
      const reference = generatePaymentReference()
      const amountInMainUnit = 5000
      const amountInMinorUnit = convertAmountToMinorUnit(5000)

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
          status: TransactionStatusesEnum.Pending,
          wallet_id: wallet.id,
          type: TransactionTypesEnum.Credit,
        })
      }

      const payload = {
        event: 'charge.success',
        data: {
          reference,
          amount: amountInMinorUnit,
        },
      }

      const secret = env.get('PAYSTACK_SECRET_KEY')
      const signature = crypto
        .createHmac('sha512', secret)
        .update(JSON.stringify(payload))
        .digest('hex')

      const wrongSignature = crypto
        .createHmac('sha512', faker.lorem.word())
        .update(JSON.stringify(payload))
        .digest('hex')

      const response = await client
        .post(route('api.v1.webhooks.payments', [PaymentProvidersEnum.Paystack]))
        .header(
          'x-paystack-signature',
          condition === 'no_signature'
            ? ''
            : condition === 'signature_mismatch'
              ? wrongSignature
              : signature
        )
        .json(payload)

      await transaction?.refresh()
      await wallet.refresh()
      assert.equal(+wallet.locked_balance, +initialWalletLockedBalance)

      if (condition === 'no_signature' || condition === 'signature_mismatch') {
        assert.equal(transaction!.status, TransactionStatusesEnum.Pending)

        response.assertStatus(401)
        return assert.equal(+wallet.balance, +initialWalletAvailableBalance)
      }

      response.assertStatus(200)

      // Periodic polling till the background job updates the transaction status
      const start = Date.now()

      while (
        transaction?.status === TransactionStatusesEnum.Pending &&
        Date.now() - start < 20000
      ) {
        await sleep(100)

        await transaction?.refresh()
        await wallet.refresh()
      }

      // Assert the transaction status and available wallet balance; locked balance always remains untouched.
      assert.equal(+wallet.locked_balance, +initialWalletLockedBalance)

      if (condition === 'main_assertion') {
        assert.equal(transaction!.status, TransactionStatusesEnum.Completed)

        return assert.equal(+wallet.balance, +initialWalletAvailableBalance + amountInMinorUnit)
      }

      if (condition === 'transaction_not_found') {
        assert.isNull(transaction)
      }

      if (condition === 'transaction_amount_mismatch') {
        assert.equal(transaction!.status, TransactionStatusesEnum.Failed)
      }

      assert.equal(+wallet.balance, +initialWalletAvailableBalance)
    })
    .tags(['webhooks', 'wallets', 'topup'])
    .timeout(30000)
})
