import { TransactionFactory } from '#database/factories/transaction_factory'
import { UserFactory } from '#database/factories/user_factory'
import { WalletFactory } from '#database/factories/wallet_factory'
import Transaction, { TransactionStatusesEnum } from '#models/transaction'
import { WalletOwnerTypesEnum } from '#models/wallet'
import BasePaymentService from '#services/payments/base_payment_service'
import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

test.group('[Base Payment Service] Expire Stale Transactions', (group) => {
  group.each.setup(async () => {
    await db.beginGlobalTransaction()

    return () => db.rollbackGlobalTransaction()
  })

  test('should mark as expired any transaction that is pending for 48 hours or more')
    .run(async ({ assert }) => {
      // Create different trasaction types for different wallets to assert t
      const expiryCutOffTime = DateTime.now().minus({ hours: 48 })
      const numberOfTransactionsPerType = 3
      const numberOfWallets = 2

      await Promise.all(
        Array.from({ length: numberOfWallets }).map(async () => {
          const user = await UserFactory.with('farmerProfile').apply('isFarmer').create()

          await user.load('farmerProfile')

          const wallet = await WalletFactory.merge({
            owner_id: user.farmerProfile.id,
            owner_type: WalletOwnerTypesEnum.Farmer,
          }).create()

          await TransactionFactory.merge({
            wallet_id: wallet.id,
            status: TransactionStatusesEnum.Pending,
          }).createMany(numberOfTransactionsPerType)
          await TransactionFactory.merge({
            wallet_id: wallet.id,
            status: TransactionStatusesEnum.Completed,
          }).createMany(numberOfTransactionsPerType)
          await TransactionFactory.merge({
            wallet_id: wallet.id,
            status: TransactionStatusesEnum.Failed,
          }).createMany(numberOfTransactionsPerType)
          await TransactionFactory.merge({
            wallet_id: wallet.id,
            status: TransactionStatusesEnum.Expired,
          }).createMany(numberOfTransactionsPerType)

          // Stale transactions are transactions that are pending for 48 hours or more
          await TransactionFactory.merge({
            wallet_id: wallet.id,
            status: TransactionStatusesEnum.Pending,
            created_at: expiryCutOffTime.minus({ minutes: 1 }),
          }).createMany(numberOfTransactionsPerType)
        })
      )

      const allPendingTransactionsQuery = Transaction.query().where({
        status: TransactionStatusesEnum.Pending,
      })
      const staleTransactionsQuery = Transaction.query()
        .where({
          status: TransactionStatusesEnum.Pending,
        })
        .where('created_at', '<=', expiryCutOffTime.toJSDate())

      const expiredTransactionsQuery = Transaction.query().where({
        status: TransactionStatusesEnum.Expired,
      })

      // Pre-execution assertions
      assert.lengthOf(
        await allPendingTransactionsQuery,
        numberOfTransactionsPerType *
          numberOfWallets *
          2 /** Multiply by 2 because the stale transactions have 'pending' status too */
      )
      assert.lengthOf(await staleTransactionsQuery, numberOfTransactionsPerType * numberOfWallets)
      assert.lengthOf(await expiredTransactionsQuery, numberOfTransactionsPerType * numberOfWallets)

      // Run the service method
      const paymentService = await app.container.make(BasePaymentService)
      const updatedCount = await paymentService.expireStaleTransactions()

      // Assert the return count
      assert.equal(updatedCount, numberOfTransactionsPerType * numberOfWallets)

      // Post-execution assertions
      assert.lengthOf(
        await allPendingTransactionsQuery,
        numberOfTransactionsPerType * numberOfWallets
      )
      assert.lengthOf(
        await expiredTransactionsQuery,
        numberOfTransactionsPerType * numberOfWallets * 2
      )
    })
    .tags(['payment_service', 'expire_stale_transactions'])
})
