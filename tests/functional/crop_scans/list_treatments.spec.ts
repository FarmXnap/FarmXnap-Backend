import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import { FarmerProfileFactory } from '#database/factories/farmer_profile_factory'
import { AgroDealerProfileFactory } from '#database/factories/agro_dealer_profile_factory'
import CropScan from '#models/crop_scan'
import { CropScanFactory } from '#database/factories/crop_scan_factory'
import {
  assertTreatmentResults,
  createProductsForAgroDealer,
} from '../../../helpers/test_helper.js'
import { cropTreatmentResult } from '../../../helpers/crop_scan_helper.js'

test.group('Crop Scans / List Treatments', (group) => {
  group.each.setup(async () => {
    await db.beginGlobalTransaction()

    return () => db.rollbackGlobalTransaction()
  })

  test('should get crop scan treatment reults: {$self}')
    .with(['main_assertion', 'not_logged_in', 'not_farmer', 'healthy_crop_scan'] as const)
    .run(async ({ client, route, assert }, condition) => {
      const isHealthy = condition === 'healthy_crop_scan'

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

      let tokenValue = ''
      if (condition !== 'not_logged_in') {
        // Simulate login
        const token = await User.accessTokens.create(
          condition === 'not_farmer' ? agroDealers[0].user : farmer.user
        )

        tokenValue = token.value!.release()
      }

      for (const dealer of agroDealers) {
        await createProductsForAgroDealer(dealer.id)
      }

      const cropScanFactory = CropScanFactory
      if (isHealthy) {
        cropScanFactory.apply('isHealthy')
      }
      const cropScans = await cropScanFactory.merge({ farmer_profile_id: farmer.id }).createMany(2)

      // Create a scan with a disease that is targeted by at least one product. (A crop scan for the `maize_with_spots.jpeg` image.)
      const targetScan = await CropScan.create({
        farmer_profile_id: farmer.id,
        crop: 'Maize',
        disease: 'Eyespot',
        category: 'Fungicide',
        active_ingredient: 'Azoxystrobin',
        search_term: 'Maize small yellow leaf spots',
        instructions:
          'Apply a recommended fungicide containing active ingredients like Azoxystrobin to control the spread of the disease.',
      })

      const response = await client
        .get(route('api.v1.crop_scans.treatments', [isHealthy ? cropScans[0].id : targetScan.id]))
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

      response.assertStatus(200)

      const treatments: cropTreatmentResult[] = response.body().data

      if (isHealthy) {
        return assert.isEmpty(treatments)
      }

      // Assert treatment results
      await assertTreatmentResults({
        verifiedDealer: agroDealers[1],
        unVerifiedDealer: agroDealers[0],
        assert,
        treatments,
      })
    })
    .tags(['crop_scans', 'list_treatments'])
})
