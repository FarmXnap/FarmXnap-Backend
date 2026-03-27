import { BANK_DATA } from '#database/seeds/bank_data'
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'agro_dealer_profiles'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.renameColumn('bank', 'bank_name')
      table.renameColumn('account_number', 'bank_account_number')

      table.string('bank_code').nullable().after('bank_name') // Nullable initially to allow the alter

      table
        .string('bank_account_name')
        .nullable() // Stays null if unverified by InterSwitch
        .after('bank_account_number')
    })

    this.defer(async (db) => {
      const records = await db.from(this.tableName).select('id', 'bank_name')

      for (const record of records) {
        if (!record.bank_name) {
          continue
        }

        const match = BANK_DATA.find((bank) => {
          const bankNameLower = bank.name.toLowerCase()
          const recordNameLower = record.bank_name.toLowerCase()
          const slugPrefix = bank.slug.split('-')[0].toLowerCase()

          return (
            (recordNameLower === 'uba' && bankNameLower.includes('united bank for africa')) ||
            recordNameLower.includes(bankNameLower) ||
            bankNameLower.includes(recordNameLower) ||
            recordNameLower.includes(slugPrefix)
          )
        })

        await db
          .from(this.tableName)
          .where('id', record.id)
          .update({ bank_code: match?.code || '000' }) // If no match (unlikely), client can prompt the user to "Update Bank Information" if bank code is "000"
      }

      await db.schema.alterTable(this.tableName, (table) => {
        table.string('bank_code').notNullable().alter()
      })
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('bank_code')
      table.dropColumn('bank_account_name')
      table.renameColumn('bank_name', 'bank')
      table.renameColumn('bank_account_number', 'account_number')
    })
  }
}
