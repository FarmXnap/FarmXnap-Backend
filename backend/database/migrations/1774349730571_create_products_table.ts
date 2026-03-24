import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'products'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id').primary().index()

      table
        .string('agro_dealer_profile_id')
        .references('id')
        .inTable('agro_dealer_profiles')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')
        .index()

      table.string('name').notNullable()
      table.string('active_ingredient').notNullable()
      table.decimal('price', 12, 2).notNullable()
      table.integer('stock_quantity').unsigned().defaultTo(0)
      table.text('description').nullable()
      table.string('category').notNullable().index() // Herbicide, etc.
      table.string('unit').notNullable() // 500ml, 1kg
      table.text('target_problems').nullable().comment('The pests or diseases the product targets.')

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
