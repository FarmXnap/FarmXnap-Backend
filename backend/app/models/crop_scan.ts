import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { cuid } from '@adonisjs/core/helpers'
import FarmerProfile from './farmer_profile.js'
import { ProductCategory } from './product.js'

export default class CropScan extends BaseModel {
  public static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare farmer_profile_id: string

  @column()
  declare crop: string

  @column()
  declare disease: string | null

  @column()
  declare instructions: string | null

  @column()
  declare search_term: string | null

  @column()
  declare active_ingredient: string | null

  @column()
  declare category: ProductCategory | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @belongsTo(() => FarmerProfile, { foreignKey: 'farmer_profile_id' })
  declare farmerProfile: BelongsTo<typeof FarmerProfile>

  @beforeCreate()
  public static assignCuid(cropScan: CropScan) {
    cropScan.id = cuid()
  }
}
