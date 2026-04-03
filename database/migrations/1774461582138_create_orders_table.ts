import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'orders'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id').primary().index()

      // TODO: look into the RESTRICT
      table
        .string('farmer_profile_id')
        .references('id')
        .inTable('farmer_profiles')
        .onDelete('RESTRICT')
        .onUpdate('CASCADE')
        .index()

      table
        .string('product_id')
        .references('id')
        .inTable('products')
        .onDelete('RESTRICT')
        .onUpdate('CASCADE')
        .index()

      table
        .string('agro_dealer_profile_id')
        .references('id')
        .inTable('agro_dealer_profiles')
        .onDelete('RESTRICT')
        .onUpdate('CASCADE')
        .index()

      table.decimal('total_amount', 12, 2).comment('Amount the farmer pays.') // What the farmer pays
      table.decimal('commission_amount', 12, 2).comment('FarmXnap commission.') // Our cut (e.g. 5%)
      table.decimal('payout_amount', 12, 2).comment('What the dealer gets.') // What the dealer gets (Total - Commission)

      table.string('status').defaultTo('Pending') // Pending, Paid, Completed
      table.string('payment_reference').unique() // Interswitch Merchant Tree Ref

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
