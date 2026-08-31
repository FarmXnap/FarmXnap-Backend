import User, { UserRolesEnum } from '#models/user'
import factory from '@adonisjs/lucid/factories'
import { randomInt } from 'node:crypto'
import { AgroDealerProfileFactory } from './agro_dealer_profile_factory.js'
import { FarmerProfileFactory } from './farmer_profile_factory.js'

const ngPrefixes = ['810', '803', '806', '703', '706', '901', '903', '814', '816']

export const UserFactory = factory
  .define(User, async ({ faker }) => {
    const randomPrefix = faker.helpers.arrayElement(ngPrefixes)
    const randomSuffix = faker.string.numeric(7)

    return {
      phone_number: `${randomPrefix}${randomSuffix}`,
      transaction_pin: randomInt(1000, 10000).toString(),
    }
  })
  .state('isFarmer', (user) => (user.role = UserRolesEnum.Farmer))
  .state('isAgroDealer', (user) => (user.role = UserRolesEnum.AgroDealer))
  .relation('agroDealerProfile', () => AgroDealerProfileFactory)
  .relation('farmerProfile', () => FarmerProfileFactory)
  .build()
