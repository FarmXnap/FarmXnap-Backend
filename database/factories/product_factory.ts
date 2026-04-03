import factory from '@adonisjs/lucid/factories'
import Product, { productCategories } from '#models/product'
import { AgroDealerProfileFactory } from './agro_dealer_profile_factory.js'

export const ProductFactory = factory
  .define(Product, async ({ faker }) => {
    return {
      name: faker.company.name(),
      active_ingredient: faker.science.chemicalElement().name,
      price: faker.number.float({ min: 1_000, max: 200_000 }).toFixed(2),
      stock_quantity: faker.number.int({ min: 1, max: 50 }),
      description: faker.lorem.sentence(),
      category: faker.helpers.arrayElement(productCategories),
      unit: faker.science.unit().name,
      target_problems: faker.animal.insect(),
    }
  })
  .relation('agroDealerProfile', () => AgroDealerProfileFactory)
  .build()
