import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import { cuid } from '@adonisjs/core/helpers'

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
  declare bank: string

  @column()
  declare account_number: string

  @column()
  declare is_verified: boolean

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @belongsTo(() => User, { foreignKey: 'user_id' })
  declare user: BelongsTo<typeof User>

  @beforeCreate()
  public static assignCuid(agro_dealer_profile: AgroDealerProfile) {
    agro_dealer_profile.id = cuid()
  }
}
