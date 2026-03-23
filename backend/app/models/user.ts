import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, beforeSave, column, hasOne } from '@adonisjs/lucid/orm'
import type { HasOne } from '@adonisjs/lucid/types/relations'
import hash from '@adonisjs/core/services/hash'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { compose, cuid } from '@adonisjs/core/helpers'
import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import FarmerProfile from './farmer_profile.js'
import OTP from './otp.js'
import AgroDealerProfile from './agro_dealer_profile.js'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

export default class User extends compose(BaseModel, AuthFinder) {
  public static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: string

  /**
   * Note: `email` and `password` are future considerations
   */
  @column()
  declare email: string | null

  @column({ serializeAs: null })
  declare password: string | null

  @column()
  declare phone_number: string

  @column()
  declare role: UserRole | null

  @column({ serializeAs: null })
  declare transaction_pin: string | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @hasOne(() => OTP, { foreignKey: 'user_id' })
  declare OTP: HasOne<typeof OTP>

  @hasOne(() => FarmerProfile, { foreignKey: 'user_id' })
  declare farmerProfile: HasOne<typeof FarmerProfile>

  @hasOne(() => AgroDealerProfile, { foreignKey: 'user_id' })
  declare agroDealerProfile: HasOne<typeof AgroDealerProfile>

  @beforeCreate()
  public static assignCuid(user: User) {
    user.id = cuid()
  }

  @beforeSave()
  public static async hashTransactionPin(user: User) {
    if (user.$dirty.transaction_pin && user.transaction_pin) {
      user.transaction_pin = await hash.make(user.transaction_pin)
    }
  }

  static accessTokens = DbAccessTokensProvider.forModel(User, { expiresIn: '30 days' })
}

export const UserRolesEnum = {
  Farmer: 'farmer',
  AgroDealer: 'agrodealer',
} as const

type UserRole = (typeof UserRolesEnum)[keyof typeof UserRolesEnum]

export const userRoles = Object.values(UserRolesEnum)
