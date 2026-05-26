import { WalletOwnerTypesEnum } from '#models/wallet'
import { cuid } from '@adonisjs/core/helpers'
import { BaseSchema } from '@adonisjs/lucid/schema'
import { DateTime } from 'luxon'

export default class extends BaseSchema {
  protected tableName = 'farmer_profiles'

  async up() {
    this.defer(async (db) => {
      const records = await db
        .from(this.tableName)
        .select('id')
        .whereNotExists((query) => {
          query.from('wallets').whereRaw(`wallets.owner_id = ${this.tableName}.id`)
        })

      if (!records.length) {
        return
      }

      const walletData = records.map((record) => ({
        id: cuid(),
        owner_id: record.id,
        owner_type: WalletOwnerTypesEnum.Farmer,
        balance: 0,
        locked_balance: 0,
        created_at: DateTime.now(),
        updated_at: DateTime.now(),
      }))

      await db.table('wallets').insert(walletData)
    })
  }

  async down() {
    await this.db.rawQuery(`DELETE FROM wallets WHERE owner_type = :ownerType;`, {
      ownerType: WalletOwnerTypesEnum.Farmer,
    })
  }
}
