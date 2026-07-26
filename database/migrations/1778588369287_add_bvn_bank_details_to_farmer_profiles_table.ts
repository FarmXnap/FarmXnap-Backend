import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'farmer_profiles'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      /**
       * These fields are necessary to facilitate the generation
       * of dedicated virtual account number.
       */
      table.string('bvn')
      table.string('bank_name')
      table.string('bank_code')
      table.string('bank_account_name')
      table.string('bank_account_number')
      table.string('first_name').index()
      table.string('last_name').index()

      table.boolean('is_verified').defaultTo(false)
    })

    this.defer(async (db) => {
      const records = await db.from(this.tableName)

      for (const record of records) {
        if (!record.full_name) {
          continue
        }

        const [firstName, ...rest] = record.full_name.trim().split(' ')
        const lastName = rest.join(' ') || 'Last Name'

        await db
          .from(this.tableName)
          .where('id', record.id)
          .update({ is_verified: false, first_name: firstName, last_name: lastName })
      }

      await db.rawQuery(`ALTER TABLE ${this.tableName} DROP COLUMN full_name`)

      await db.rawQuery(`ALTER TABLE ${this.tableName} ALTER COLUMN first_name SET NOT NULL`)
      await db.rawQuery(`ALTER TABLE ${this.tableName} ALTER COLUMN last_name SET NOT NULL`)
      await db.rawQuery(`ALTER TABLE ${this.tableName} ALTER COLUMN is_verified SET NOT NULL`)

      // Add full_name as a "generated" column
      await db.rawQuery(`
        ALTER TABLE ${this.tableName}
        ADD COLUMN full_name VARCHAR(255) GENERATED ALWAYS AS (TRIM(first_name) || ' ' || TRIM(last_name)) STORED
        `)

      await db.rawQuery(
        `CREATE INDEX farmer_profiles_full_name_index ON ${this.tableName} (full_name)`
      )
    })
  }

  async down() {
    this.defer(async (db) => {
      await db.rawQuery(`ALTER TABLE ${this.tableName} DROP COLUMN IF EXISTS full_name`)

      await db.rawQuery(`ALTER TABLE ${this.tableName} ADD COLUMN full_name VARCHAR(255)`)
      await db.rawQuery(`CREATE INDEX farmer_profiles_full_name_index ON ${this.tableName} (full_name);
      `)

      await db.rawQuery(
        `UPDATE ${this.tableName} SET full_name = TRIM(first_name) || ' ' || TRIM(last_name)`
      )

      await db.rawQuery(`ALTER TABLE ${this.tableName} ALTER COLUMN full_name SET NOT NULL`)

      await db.rawQuery(`
      ALTER TABLE ${this.tableName} 
      DROP COLUMN is_verified, 
      DROP COLUMN last_name, 
      DROP COLUMN first_name, 
      DROP COLUMN bank_account_number, 
      DROP COLUMN bank_account_name, 
      DROP COLUMN bank_code, 
      DROP COLUMN bank_name, 
      DROP COLUMN bvn
    `)
    })
  }
}
