import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import { AgroDealerProfileFactory } from '#database/factories/agro_dealer_profile_factory'
import { FarmerProfileFactory } from '#database/factories/farmer_profile_factory'
import { ProductFactory } from '#database/factories/product_factory'
import { callbackUrl, nairaISOCode } from '../../../helpers/utils.js'
import env from '#start/env'

test.group('Orders / Store', (group) => {
  group.each.setup(async () => {
    await db.beginGlobalTransaction()

    return () => db.rollbackGlobalTransaction()
  })

  test('should create an order by a farmer: {$self}')
    .with(['main_assertion', 'not_logged_in', 'not_farmer'] as const)
    .run(async ({ assert, client, route }, condition) => {
      const agroDealer = await AgroDealerProfileFactory.apply('isVerified')
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
          condition === 'not_farmer' ? agroDealer.user : farmer.user
        )

        tokenValue = token.value!.release()
      }

      const products = await ProductFactory.merge({
        agro_dealer_profile_id: agroDealer.id,
      }).createMany(3)

      const targetProduct = products[1]

      const response = await client
        .post(route('api.v1.products.orders.store', [targetProduct.id]))
        .bearerToken(tokenValue)

      if (condition === 'not_logged_in') {
        response.assertStatus(401)

        return response.assertBodyContains({ error: 'Unauthorized access' })
      }

      if (condition === 'not_farmer') {
        response.assertStatus(403)

        return response.assertBodyContains({
          error: 'You do not have permission to access this resource.',
        })
      }

      response.assertStatus(201)

      await farmer.load('orders')
      assert.lengthOf(farmer.orders, 1)

      const responseData = response.body().data

      assert.properties(responseData, ['id', 'paymentData'])
      assert.properties(responseData.paymentData, [
        'merchantCode',
        'payItemId',
        'txnRef',
        'amount',
        'currency',
        'callbackUrl',
      ])

      response.assertBodyContains({
        message: 'Order initialized.',
        data: {
          id: farmer.orders[0].id,
          paymentData: {
            merchantCode: env.get('INTERSWITCH_MERCHANT_CODE'),
            payItemId: env.get('INTERSWITCH_PAY_ITEM_ID'),
            amount: +targetProduct.price * 100,
            currency: nairaISOCode,
            callbackUrl: callbackUrl,
          },
        },
      })
    })
    .tags(['orders', 'create_order'])
})
