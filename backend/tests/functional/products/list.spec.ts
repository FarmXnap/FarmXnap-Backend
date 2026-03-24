import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import { AgroDealerProfileFactory } from '#database/factories/agro_dealer_profile_factory'
import { FarmerProfileFactory } from '#database/factories/farmer_profile_factory'
import { ProductFactory } from '#database/factories/product_factory'
import { ModelObject } from '@adonisjs/lucid/types/model'

test.group('Products / List', (group) => {
  group.each.setup(async () => {
    await db.beginGlobalTransaction()

    return () => db.rollbackGlobalTransaction()
  })

  test('should list products by an agro-dealer: {$self}')
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
      const agroDealers = await AgroDealerProfileFactory.merge({
        is_verified: condition !== 'not_verified',
      })
        .with('user', 1, (userQuery) => {
          userQuery.apply('isAgroDealer')
        })
        .createMany(2)
      const [agroDealer, anotherAgroDealer] = agroDealers

      const farmer = await FarmerProfileFactory.with('user', 1, (userQuery) => {
        userQuery.apply('isFarmer')
      }).create()

      await Promise.all([agroDealer.load('user'), farmer.load('user')])

      for (const dealer of agroDealers) {
        await ProductFactory.merge({ agro_dealer_profile_id: dealer.id }).createMany(10)
      }

      let tokenValue = ''
      if (condition !== 'not_logged_in') {
        // Simulate login
        const token = await User.accessTokens.create(
          condition === 'not_agrodealer' ? farmer.user : agroDealer.user
        )

        tokenValue = token.value!.release()
      }

      const response = await client.get(route('api.v1.products.index')).bearerToken(tokenValue)

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

      response.assertStatus(200)

      await Promise.all([agroDealer.load('products'), anotherAgroDealer.load('products')])
      assert.lengthOf(agroDealer.products, 10)

      const responseData: ModelObject[] = response.body().data

      assert.lengthOf(responseData, agroDealer.products.length)

      response.assertBodyContains({
        data: agroDealer.products.map((product) => ({
          id: product.id,
          name: product.name,
          category: product.category,
          unit: product.unit,
          price: product.price,
          stock_quantity: product.stock_quantity,
          target_problems: product.target_problems,
          links: {
            create: {
              method: 'POST',
              href: `/api/v1/products`,
            },
          },
        })),
      })

      const responseDataIds = responseData.map((data) => data.id)
      // Assert that another dealer's products are not returned
      for (const product of anotherAgroDealer.products) {
        assert.notInclude(responseDataIds, product.id)
      }
    })
    .tags(['products', 'list_products'])
})
