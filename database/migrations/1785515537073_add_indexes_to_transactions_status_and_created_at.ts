import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'transactions'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // 1. Composite index for status + created_at range queries e.g. the stale transaction cleanup job
      table.index(['status', 'created_at'])

      // 2. Standalone index on created_at for sorting/pagination e.g. ORDER BY created_at DESC
      table.index(['created_at'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['status', 'created_at'])
      table.dropIndex(['created_at'])
    })
  }
}
