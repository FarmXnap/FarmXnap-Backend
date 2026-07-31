import factory from '@adonisjs/lucid/factories'
import Wallet from '#models/wallet'
import { TransactionFactory } from './transaction_factory.js'

export const WalletFactory = factory
  .define(Wallet, async ({ faker }) => {
    return {
      balance: faker.number.int({ min: 10_000_00, max: 200_000_00 }),
      locked_balance: faker.number.int({ min: 5_000_00, max: 7_000_00 }),
    }
  })
  .relation('transactions', () => TransactionFactory)
  .build()
