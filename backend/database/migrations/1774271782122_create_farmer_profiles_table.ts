import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'farmer_profiles'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id').primary().index()

      table
        .string('user_id')
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')
        .index()

      table.string('full_name').notNullable()
      table.string('state').notNullable()
      table.string('lga').nullable()
      table.string('primary_crop').notNullable()

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
