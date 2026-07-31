import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import { cuid } from '@adonisjs/core/helpers'
import Wallet from './wallet.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { PaymentProviderName } from '#helpers/payment_helper'

export default class Transaction extends BaseModel {
  public static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare wallet_id: string

  @column()
  declare type: TransactionType

  @column()
  declare category: TransactionCategory

  @column()
  declare status: TransactionStatus

  @column()
  declare reference: string | null

  /**
   * NB: Amount is in minor unit.
   */
  @column()
  declare amount: string | number

  @column()
  declare provider: PaymentProviderName | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @belongsTo(() => Wallet, { foreignKey: 'wallet_id' })
  declare wallet: BelongsTo<typeof Wallet>

  @beforeCreate()
  public static assignCuid(order: Transaction) {
    order.id = cuid()
  }
}

export const TransactionStatusesEnum = {
  Pending: 'pending',
  Completed: 'completed',
  Failed: 'failed',
  Expired: 'expired',
} as const

export const transactionStatuses = Object.values(TransactionStatusesEnum)

type TransactionStatus = (typeof TransactionStatusesEnum)[keyof typeof TransactionStatusesEnum]

export const TransactionCategoriesEnum = {
  Topup: 'topup',
  Revenue: 'revenue',
  EscrowBooking: 'escrow_booking',
  EscrowRelease: 'escrow_release',
  Commission: 'commission',
} as const

export const transactionCategories = Object.values(TransactionCategoriesEnum)

type TransactionCategory =
  (typeof TransactionCategoriesEnum)[keyof typeof TransactionCategoriesEnum]

export const TransactionTypesEnum = {
  Credit: 'credit',
  Debit: 'debit',
  Lock: 'lock',
  Unlock: 'unlock',
} as const

export const transactionTypes = Object.values(TransactionTypesEnum)

type TransactionType = (typeof TransactionTypesEnum)[keyof typeof TransactionTypesEnum]
