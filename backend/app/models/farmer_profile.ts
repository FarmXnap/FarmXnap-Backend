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

  @column()
  declare full_name: string

  @column()
  declare state: string

  @column()
  declare lga: string

  @column()
  declare address: string

  @column()
  declare primary_crop: string

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
