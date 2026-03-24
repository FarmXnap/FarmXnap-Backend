import AgroDealerProfile from '#models/agro_dealer_profile'
import factory from '@adonisjs/lucid/factories'
import { randomInt } from 'node:crypto'
import { UserFactory } from './user_factory.js'

export const AgroDealerProfileFactory = factory
  .define(AgroDealerProfile, async ({ faker }) => {
    return {
      account_number: randomInt(1_000_000_000, 10_000_000_000).toString(),
      bank: faker.company.name(),
      business_address: faker.location.streetAddress(),
      state: faker.location.state(),
      cac_registration_number: faker.lorem.word(),
      business_name: faker.company.name(),
      is_verified: false,
    }
  })
  .state('isVerified', (agroDealerProfile) => (agroDealerProfile.is_verified = true))
  .relation('user', () => UserFactory)
  .build()
