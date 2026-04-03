import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'crop_scans'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id').primary().index()
      table
        .string('farmer_profile_id')
        .references('id')
        .inTable('farmer_profiles')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')

      // table.string('image_path').notNullable()
      // todo: file_uploads table for the image
      table.string('crop').notNullable()
      table.string('disease').nullable() // Null if healthy
      table.text('instructions').nullable()

      // Store AI metadata for re-searching later
      table.string('search_term').nullable()
      table.string('active_ingredient').nullable()
      table.string('category').nullable()

      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
