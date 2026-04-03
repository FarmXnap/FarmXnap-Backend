import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { cuid } from '@adonisjs/core/helpers'
import AgroDealerProfile from './agro_dealer_profile.js'
import FarmerProfile from './farmer_profile.js'
import Product from './product.js'

export default class Order extends BaseModel {
  public static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare farmer_profile_id: string

  @column()
  declare product_id: string

  @column()
  declare agro_dealer_profile_id: string

  @column()
  declare total_amount: string

  @column()
  declare commission_amount: string

  @column()
  declare payout_amount: string

  @column()
  declare status: OrderStatus

  @column()
  declare payment_reference: string

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @belongsTo(() => AgroDealerProfile, { foreignKey: 'agro_dealer_profile_id' })
  declare agroDealerProfile: BelongsTo<typeof AgroDealerProfile>

  @belongsTo(() => FarmerProfile, { foreignKey: 'farmer_profile_id' })
  declare farmerProfile: BelongsTo<typeof FarmerProfile>

  @belongsTo(() => Product, { foreignKey: 'product_id' })
  declare product: BelongsTo<typeof Product>

  @beforeCreate()
  public static assignCuid(order: Order) {
    order.id = cuid()
  }
}

export const OrderStatusEnum = {
  Pending: 'Pending',
  Paid: 'Paid',
  Completed: 'Completed',
  Failed: 'Failed',
} as const

type OrderStatus = (typeof OrderStatusEnum)[keyof typeof OrderStatusEnum]
