import factory from '@adonisjs/lucid/factories'
import { UserFactory } from './user_factory.js'
import FarmerProfile from '#models/farmer_profile'

export const FarmerProfileFactory = factory
  .define(FarmerProfile, async ({ faker }) => {
    return {
      full_name: faker.person.firstName(),
      state: faker.location.state(),
      lga: faker.location.county(),
      address: faker.location.streetAddress(),
      primary_crop: faker.lorem.word(),
    }
  })
  .relation('user', () => UserFactory)
  .build()
