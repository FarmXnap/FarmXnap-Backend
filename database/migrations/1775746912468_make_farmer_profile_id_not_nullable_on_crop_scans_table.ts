import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'crop_scans'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // It is guaranteed that every crop scan record in the database is already linked to a farmer profile
      table.string('farmer_profile_id').notNullable().alter()
    })
  }

  // No reversal
  async down() {}
}
