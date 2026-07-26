import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'agro_dealer_profiles'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('bank_account_name').notNullable().alter() // Bank account must be verified during the registration step
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('bank_account_name').nullable().alter()
    })
  }
}

// This migration is guaranteed to run successfully as there is currently no null `bank_account_name` field.
