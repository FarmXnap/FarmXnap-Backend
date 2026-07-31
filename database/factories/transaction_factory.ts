import factory from '@adonisjs/lucid/factories'
import Transaction, {
  TransactionCategoriesEnum,
  TransactionStatusesEnum,
  TransactionTypesEnum,
} from '#models/transaction'
import { WalletFactory } from './wallet_factory.js'
import { generatePaymentReference, PaymentProvidersEnum } from '#helpers/payment_helper'

export const TransactionFactory = factory
  .define(Transaction, async ({ faker }) => {
    const reference = generatePaymentReference()

    return {
      type: TransactionTypesEnum.Credit,
      category: TransactionCategoriesEnum.Topup,
      status: TransactionStatusesEnum.Pending,
      reference,
      amount: faker.number.int({ min: 5_000, max: 200_000 }),

      provider: PaymentProvidersEnum.Paystack,
    }
  })
  .relation('wallet', () => WalletFactory)
  .build()
