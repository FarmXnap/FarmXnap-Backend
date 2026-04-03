import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import { faker } from '@faker-js/faker'
import User from '#models/user'
import { AgroDealerProfileFactory } from '#database/factories/agro_dealer_profile_factory'
import { FarmerProfileFactory } from '#database/factories/farmer_profile_factory'

test.group('Products / Store', (group) => {
  group.each.setup(async () => {
    await db.beginGlobalTransaction()

    return () => db.rollbackGlobalTransaction()
  })

  test('should create a product by an agro-dealer: {$self}')
    .with([
      'main_assertion',
      'not_logged_in',
      'not_agrodealer',
      'not_verified',
      /**
       * @todo: test validation and other cases.
       */
    ] as const)
    .run(async ({ assert, client, route }, condition) => {
      const agroDealer = await AgroDealerProfileFactory.merge({
        is_verified: condition !== 'not_verified',
      })
        .with('user', 1, (userQuery) => {
          userQuery.apply('isAgroDealer')
        })
        .create()
      const farmer = await FarmerProfileFactory.with('user', 1, (userQuery) => {
        userQuery.apply('isFarmer')
      }).create()

      await Promise.all([agroDealer.load('user'), farmer.load('user')])

      let tokenValue = ''
      if (condition !== 'not_logged_in') {
        // Simulate login
        const token = await User.accessTokens.create(
          condition === 'not_agrodealer' ? farmer.user : agroDealer.user
        )

        tokenValue = token.value!.release()
      }

      const payload = {
        name: 'Mancozeb 80WP',
        active_ingredient: 'Mancozeb 80WP',
        price: 3500,
        stock_quantity: 4,
        description: faker.lorem.sentence(),
        category: 'Fungicide',
        unit: '1 kg',
        target_problems: 'Early blight, Downy mildew',
      }

      const response = await client
        .post(route('api.v1.products.store'))
        .json(payload)
        .bearerToken(tokenValue)

      if (condition === 'not_logged_in') {
        response.assertStatus(401)

        return response.assertBodyContains({ error: 'Unauthorized access' })
      }

      if (condition === 'not_agrodealer') {
        response.assertStatus(403)

        return response.assertBodyContains({
          error: 'You do not have permission to access this resource.',
        })
      }

      if (condition === 'not_verified') {
        response.assertStatus(403)

        return response.assertBodyContains({
          error: 'You cannot perform this action until you complete verification.',
        })
      }

      response.assertStatus(201)

      await agroDealer.load('products')
      assert.lengthOf(agroDealer.products, 1)

      response.assertBodyContains({
        message: 'Product created successfully.',
        data: {
          id: agroDealer.products[0].id,
          name: agroDealer.products[0].name,
          active_ingredient: agroDealer.products[0].active_ingredient,
          category: agroDealer.products[0].category,
          description: agroDealer.products[0].description,
          price: agroDealer.products[0].price,
          stock_quantity: agroDealer.products[0].stock_quantity,
          target_problems: agroDealer.products[0].target_problems,
          unit: agroDealer.products[0].unit,
          links: {
            view: {
              method: 'GET',
              href: `/api/v1/products/${agroDealer.products[0].id}`,
            },
            update: {
              method: 'PUT',
              href: `/api/v1/products/${agroDealer.products[0].id}`,
            },
          },
        },
      })

      assert.containSubset(agroDealer.products[0], {
        name: payload.name,
        active_ingredient: payload.active_ingredient,
        category: payload.category,
        description: payload.description,
        price: payload.price.toFixed(2),
        stock_quantity: payload.stock_quantity,
        target_problems: payload.target_problems,
        unit: payload.unit,
      })

      assert.exists(agroDealer.products[0].created_at)
      assert.exists(agroDealer.products[0].updated_at)
    })
    .tags(['products', 'create_product'])
})
