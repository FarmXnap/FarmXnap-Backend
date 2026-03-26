import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import { cuid } from '@adonisjs/core/helpers'

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

  @beforeCreate()
  public static assignCuid(farmer_profile: FarmerProfile) {
    farmer_profile.id = cuid()
  }
}
