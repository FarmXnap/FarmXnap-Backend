import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import { cuid } from '@adonisjs/core/helpers'
import Product from './product.js'
import Order from './order.js'

export default class AgroDealerProfile extends BaseModel {
  public static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare user_id: string

  @column()
  declare business_name: string

  @column()
  declare cac_registration_number: string

  @column()
  declare business_address: string

  @column()
  declare state: string

  @column()
  declare lga: string

  @column()
  declare bank_name: string

  @column()
  declare bank_code: string

  @column()
  declare bank_account_number: string

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

  @hasMany(() => Product, { foreignKey: 'agro_dealer_profile_id' })
  declare products: HasMany<typeof Product>

  @hasMany(() => Order, { foreignKey: 'agro_dealer_profile_id' })
  declare orders: HasMany<typeof Order>

  @beforeCreate()
  public static assignCuid(agro_dealer_profile: AgroDealerProfile) {
    agro_dealer_profile.id = cuid()
  }
}
