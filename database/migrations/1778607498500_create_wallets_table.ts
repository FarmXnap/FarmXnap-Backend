import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'wallets'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id').primary().index()
      table.string('owner_id').notNullable().index().unique()
      table.enum('owner_type', ['farmer', 'agrodealer', 'system']).notNullable().index()
      table
        .bigint('balance')
        .notNullable()
        .defaultTo(0)
        .index()
        .comment('Available Balance in minor unit.')
      table
        .bigint('locked_balance')
        .notNullable()
        .defaultTo(0)
        .index()
        .comment('Locked Balance in minor unit.')

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()

      table.index(['owner_id', 'owner_type'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
