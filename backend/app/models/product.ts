import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { cuid } from '@adonisjs/core/helpers'
import AgroDealerProfile from './agro_dealer_profile.js'

export default class Product extends BaseModel {
  public static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare agro_dealer_profile_id: string

  @column()
  declare name: string

  @column()
  declare active_ingredient: string

  @column()
  declare price: string

  @column()
  declare stock_quantity: number

  @column()
  declare category: ProductCategory

  @column()
  declare unit: string

  @column()
  declare description: string | null

  @column()
  declare target_problems: string | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @belongsTo(() => AgroDealerProfile, { foreignKey: 'agro_dealer_profile_id' })
  declare agroDealerProfile: BelongsTo<typeof AgroDealerProfile>

  @beforeCreate()
  public static assignCuid(product: Product) {
    product.id = cuid()
  }
}

export const productCategories = [
  'Fungicide',
  'Insecticide',
  'Herbicide',
  'Fertilizer',
  'Other',
] as const

export type ProductCategory = (typeof productCategories)[number]
