import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import { cuid } from '@adonisjs/core/helpers'
import Order from './order.js'

export default class FarmerProfile extends BaseModel {
  public static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare user_id: string

  /**
   * IMPORTANT: The `first_name` and `last_name` are closely linked to the `bvn` and bank-related fields
   * (used by the payment provider for customer validation when issuing dedicated virtual account number).
   * These fields, once set, should not be easily updateable.
   */
  @column()
  declare first_name: string

  @column()
  declare last_name: string

  /**
   * This is a "generated" column based on
   * `first_name` and `last_name`
   */
  @column({ prepare: () => undefined })
  declare full_name: string

  @column()
  declare state: string

  @column()
  declare lga: string

  @column()
  declare address: string

  @column()
  declare primary_crop: string

  @column()
  declare bvn: string | null

  @column()
  declare bank_name: string | null

  @column()
  declare bank_code: string | null

  @column()
  declare bank_account_number: string | null

  @column()
  declare bank_account_name: string | null

  @column()
  declare is_verified: boolean

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @belongsTo(() => User, { foreignKey: 'user_id' })
  declare user: BelongsTo<typeof User>

  @hasMany(() => Order, { foreignKey: 'farmer_profile_id' })
  declare orders: HasMany<typeof Order>

  @beforeCreate()
  public static assignCuid(farmer_profile: FarmerProfile) {
    farmer_profile.id = cuid()
  }
}
