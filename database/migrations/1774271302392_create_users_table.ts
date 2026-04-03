import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id').primary().index()

      table.string('phone_number').notNullable().unique().index()

      table.string('email', 254).nullable().unique()

      table.string('password').nullable()

      table.enum('role', ['farmer', 'agrodealer']).nullable()

      table.string('transaction_pin').nullable()

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
