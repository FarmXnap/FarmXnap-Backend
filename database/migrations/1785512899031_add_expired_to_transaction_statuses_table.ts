import { transactionStatuses, TransactionStatusesEnum } from '#models/transaction'
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'transactions'

  async up() {
    // Convert array ['pending', 'completed', 'failed', 'expired'] -> "'pending', 'completed', 'failed', 'expired'"
    const allowedStatuses = transactionStatuses.map((s) => `'${s}'`).join(', ')

    this.defer(async (db) => {
      // 1. Drop existing check constraint
      await db.rawQuery(
        `ALTER TABLE "${this.tableName}" DROP CONSTRAINT IF EXISTS "transactions_status_check";`
      )

      // 2. Add updated check constraint including 'expired'
      await db.rawQuery(
        `ALTER TABLE "${this.tableName}" ADD CONSTRAINT "transactions_status_check" CHECK (status IN (${allowedStatuses}));`
      )
    })
  }

  async down() {
    const previousStatuses = transactionStatuses
      .filter((s) => s !== TransactionStatusesEnum.Expired)
      .map((s) => `'${s}'`)
      .join(', ')

    this.defer(async (db) => {
      await db.rawQuery(
        `ALTER TABLE "${this.tableName}" DROP CONSTRAINT IF EXISTS "transactions_status_check";`
      )

      await db.rawQuery(
        `ALTER TABLE "${this.tableName}" ADD CONSTRAINT "transactions_status_check" CHECK (status IN (${previousStatuses}));`
      )
    })
  }
}
