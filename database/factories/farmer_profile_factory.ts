import factory from '@adonisjs/lucid/factories'
import { UserFactory } from './user_factory.js'
import FarmerProfile from '#models/farmer_profile'
import { randomInt } from 'node:crypto'
import { faker } from '@faker-js/faker'
import { BANK_DATA } from '#database/seeds/bank_data'

export const FarmerProfileFactory = factory
  .define(FarmerProfile, async ({ faker }) => {
    return {
      first_name: faker.person.firstName(),
      last_name: faker.person.lastName(),
      state: faker.location.state(),
      lga: faker.location.county(),
      address: faker.location.streetAddress(),
      primary_crop: faker.lorem.word(),
    }
  })
  .state('isVerified', (farmerProfile) => {
    const bank = faker.helpers.arrayElement(BANK_DATA)

    farmerProfile.is_verified = true
    farmerProfile.bank_account_number = randomInt(1_000_000_000, 10_000_000_000).toString()
    ;((farmerProfile.bank_code = bank.code),
      (farmerProfile.bank_name = bank.name),
      (farmerProfile.bank_account_name = faker.person.fullName()),
      (farmerProfile.bvn = randomInt(1_000_000_000, 100_000_000_000).toString()))
  })
  .relation('user', () => UserFactory)
  .build()
