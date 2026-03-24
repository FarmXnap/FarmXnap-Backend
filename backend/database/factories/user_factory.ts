import User, { UserRolesEnum } from '#models/user'
import factory from '@adonisjs/lucid/factories'
import { randomInt } from 'node:crypto'
import { AgroDealerProfileFactory } from './agro_dealer_profile_factory.js'
import { FarmerProfileFactory } from './farmer_profile_factory.js'

export const UserFactory = factory
  .define(User, async () => {
    return {
      phone_number: randomInt(10_000_000_000, 100_000_000_000).toString(),
      transaction_pin: randomInt(1000, 10000).toString(),
    }
  })
  .state('isFarmer', (user) => (user.role = UserRolesEnum.Farmer))
  .state('isAgroDealer', (user) => (user.role = UserRolesEnum.AgroDealer))
  .relation('agroDealerProfile', () => AgroDealerProfileFactory)
  .relation('farmerProfile', () => FarmerProfileFactory)
  .build()
