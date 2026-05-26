import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, column } from '@adonisjs/lucid/orm'
import { cuid } from '@adonisjs/core/helpers'

export default class Wallet extends BaseModel {
  public static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare owner_id: string

  @column()
  declare owner_type: WalletOwnerType

  /**
   * NB: Balances are in minor unit.
   */
  @column()
  declare balance: string | number

  @column()
  declare locked_balance: string | number

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @beforeCreate()
  public static assignCuid(order: Wallet) {
    order.id = cuid()
  }
}

export const WalletOwnerTypesEnum = {
  Farmer: 'farmer',
  AgroDealer: 'agrodealer',
  System: 'system',
} as const

type WalletOwnerType = (typeof WalletOwnerTypesEnum)[keyof typeof WalletOwnerTypesEnum]
