import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  public async up() {
    this.schema.alterTable('farmer_profiles', (table) => {
      table.string('address').nullable()
    })

    this.schema.alterTable('agro_dealer_profiles', (table) => {
      table.string('lga').nullable()
    })

    this.defer(async (db) => {
      await db.from('farmer_profiles').update({
        address: 'Address Not Provided',
        lga: 'Default LGA',
      })

      await db.from('agro_dealer_profiles').update({
        lga: 'Default LGA',
      })

      await this.schema.alterTable('farmer_profiles', (table) => {
        table.string('address').notNullable().alter()
        table.string('lga').notNullable().alter()
      })

      await this.schema.alterTable('agro_dealer_profiles', (table) => {
        table.string('lga').notNullable().alter()
      })

      // In future, prefer db.rawQuery to using the schema in a defer block. See `1778588369287_add_bvn_bank_details_to_farmer_profiles_table.ts`
    })
  }

  // No reversal
  public async down() {}
}
