import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import { AgroDealerProfileFactory } from '#database/factories/agro_dealer_profile_factory'
import { FarmerProfileFactory } from '#database/factories/farmer_profile_factory'
import { cuid } from '@adonisjs/core/helpers'

test.group('Products / Show', (group) => {
  group.each.setup(async () => {
    await db.beginGlobalTransaction()

    return () => db.rollbackGlobalTransaction()
  })

  test('should show a product by an agro-dealer: {$self}')
    .with([
      'main_assertion',
      'not_logged_in',
      'not_agrodealer',
      'not_verified',
      'product_not_found',
    ] as const)
    .run(async ({ client, route }, condition) => {
      const agroDealers = await AgroDealerProfileFactory.merge({
        is_verified: condition !== 'not_verified',
      })
        .with('user', 1, (userQuery) => {
          userQuery.apply('isAgroDealer')
        })
        .with('products', 3)
        .createMany(2)
      const [agroDealer, _] = agroDealers

      const farmer = await FarmerProfileFactory.with('user', 1, (userQuery) => {
        userQuery.apply('isFarmer')
      }).create()

      await Promise.all([agroDealer.load('user'), agroDealer.load('products'), farmer.load('user')])

      let tokenValue = ''
      if (condition !== 'not_logged_in') {
        // Simulate login
        const token = await User.accessTokens.create(
          condition === 'not_agrodealer' ? farmer.user : agroDealer.user
        )

        tokenValue = token.value!.release()
      }

      const targetProduct = agroDealer.products[1]

      const response = await client
        .get(
          route('api.v1.products.show', [
            condition === 'product_not_found' ? cuid() : targetProduct.id,
          ])
        )
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

      if (condition === 'product_not_found') {
        response.assertStatus(404)

        return response.assertBodyContains({
          error: 'Product not found.',
        })
      }

      response.assertStatus(200)

      response.assertBodyContains({
        data: {
          id: targetProduct.id,
          name: targetProduct.name,
          category: targetProduct.category,
          unit: targetProduct.unit,
          price: targetProduct.price,
          stock_quantity: targetProduct.stock_quantity,
          target_problems: targetProduct.target_problems,
          links: {
            view: {
              method: 'GET',
              href: `/api/v1/products/${targetProduct.id}`,
            },
            update: {
              method: 'PUT',
              href: `/api/v1/products/${targetProduct.id}`,
            },
          },
        },
      })
    })
    .tags(['products', 'show_product'])
})
