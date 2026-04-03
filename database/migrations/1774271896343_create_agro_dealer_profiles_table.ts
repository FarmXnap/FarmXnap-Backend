import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'agro_dealer_profiles'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id').primary().index()
      table
        .string('user_id')
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')
        .notNullable()
        .index()

      table.string('business_name').notNullable()
      table.string('cac_registration_number').notNullable()
      // table.string('business_phone').notNullable()
      table.string('business_address').notNullable()
      table.string('state').notNullable()

      // Bank detail fields are not nullable for this hackathon demo. In future, they can be nullable during signup and another endpoint for updating profile details provided
      table.string('bank').notNullable()
      table.string('account_number').notNullable()

      table.boolean('is_verified').notNullable().defaultTo(false)

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()

      // todo: file_uploads table for cac certificate and id (nin/passport) docs
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
