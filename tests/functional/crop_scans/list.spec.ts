import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import { FarmerProfileFactory } from '#database/factories/farmer_profile_factory'
import { AgroDealerProfileFactory } from '#database/factories/agro_dealer_profile_factory'

test.group('Crop Scans / List Crop Scans', (group) => {
  group.each.setup(async () => {
    await db.beginGlobalTransaction()

    return () => db.rollbackGlobalTransaction()
  })

  test('should get crop scans for a farmer: {$self}')
    .with([
      'main_assertion',
      //   'not_logged_in',
      //   'not_farmer',
    ] as const)
    .run(async ({ client, route }) => {
      const farmer = await FarmerProfileFactory.with('user', 1, (userQuery) => {
        userQuery.apply('isFarmer')
      }).create()

      const agroDealers = await AgroDealerProfileFactory.with('user', 1, (userQuery) => {
        userQuery.apply('isAgroDealer')
      }).createMany(2)

      await agroDealers[1].merge({ is_verified: true }).save()

      await Promise.all([
        await Promise.all(agroDealers.map(async (dealer) => await dealer.load('user'))),
        farmer.load('user'),
      ])

      // Simulate login
      const token = await User.accessTokens.create(farmer.user)

      const tokenValue = token.value!.release()

      const response = await client.get(route('api.v1.crop_scans.index')).bearerToken(tokenValue)

      response.assertStatus(200)
    })
    .tags(['crop_scans', 'list_crop_scans'])
  // .pin()
  // .timeout(30000)
})
