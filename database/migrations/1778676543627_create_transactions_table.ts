import { paymentProviders } from '#helpers/payment_helper'
import {
  transactionCategories,
  transactionStatuses,
  TransactionStatusesEnum,
  transactionTypes,
} from '#models/transaction'
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'transactions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id').primary().index()
      table
        .string('wallet_id')
        .notNullable()
        .index()
        .references('id')
        .inTable('wallets')
        .onUpdate('CASCADE')
        .onDelete('RESTRICT')

      table.enum('type', transactionTypes).notNullable().index()

      table.enum('category', transactionCategories).notNullable().index()

      table
        .enum('status', transactionStatuses)
        .notNullable()
        .defaultTo(TransactionStatusesEnum.Pending)
        .index()

      table.string('reference').nullable().index()

      table.enum('provider', paymentProviders).nullable().index()

      table.bigint('amount').notNullable().index().comment('Amount in minor unit.')

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
