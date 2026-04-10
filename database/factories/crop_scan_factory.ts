import factory from '@adonisjs/lucid/factories'
import { productCategories } from '#models/product'
import CropScan from '#models/crop_scan'
import { FarmerProfileFactory } from './farmer_profile_factory.js'

export const CropScanFactory = factory
  .define(CropScan, async ({ faker }) => {
    return {
      crop: faker.helpers.arrayElement([
        'Rice',
        'Beans',
        'Cassava',
        'Maize',
        'Plantain',
        'Yam',
        'Tomato',
      ]),
      disease: faker.lorem.word(),
      instructions: faker.lorem.sentence(),
      search_term: faker.lorem.words({ min: 3, max: 5 }),
      active_ingredient: faker.science.chemicalElement().name,
      category: faker.helpers.arrayElement(productCategories),
    }
  })
  .state('isHealthy', (cropScan) => {
    cropScan.disease = null
    cropScan.search_term = null
    cropScan.active_ingredient = null
    cropScan.category = null
  })
  .relation('farmerProfile', () => FarmerProfileFactory)
  .build()
