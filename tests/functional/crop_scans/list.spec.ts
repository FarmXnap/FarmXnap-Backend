import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import { FarmerProfileFactory } from '#database/factories/farmer_profile_factory'
import { AgroDealerProfileFactory } from '#database/factories/agro_dealer_profile_factory'
import { CropScanFactory } from '#database/factories/crop_scan_factory'
import CropScan from '#models/crop_scan'

test.group('Crop Scans / List Crop Scans', (group) => {
  group.each.setup(async () => {
    await db.beginGlobalTransaction()

    return () => db.rollbackGlobalTransaction()
  })

  test('should get crop scans for a farmer: {$self}')
    .with(['main_assertion', 'not_logged_in', 'not_farmer'] as const)
    .run(async ({ client, route, assert }, condition) => {
      const farmers = await FarmerProfileFactory.with('user', 1, (userQuery) => {
        userQuery.apply('isFarmer')
      }).createMany(2)

      const [farmer, anotherFarmer] = farmers

      const agroDealer = await AgroDealerProfileFactory.apply('isVerified')
        .with('user', 1, (userQuery) => {
          userQuery.apply('isAgroDealer')
        })
        .create()

      await Promise.all([await agroDealer.load('user'), farmer.load('user')])

      let tokenValue = ''
      if (condition !== 'not_logged_in') {
        // Simulate login
        const token = await User.accessTokens.create(
          condition === 'not_farmer' ? agroDealer.user : farmer.user
        )

        tokenValue = token.value!.release()
      }

      // Create crop scans for both farmers to assert that only the scans for the logged-in farmer are returned
      const numberOfScans = 4
      await Promise.all(
        farmers.map(async (f) => {
          await CropScanFactory.merge({ farmer_profile_id: f.id }).createMany(numberOfScans / 2)
          await CropScanFactory.merge({ farmer_profile_id: f.id })
            .apply('isHealthy')
            .createMany(numberOfScans / 2)
        })
      )

      assert.lengthOf(await CropScan.query(), numberOfScans * farmers.length)

      const response = await client.get(route('api.v1.crop_scans.index')).bearerToken(tokenValue)

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

      const responseData: CropScan[] = response.body().data

      assert.lengthOf(responseData, numberOfScans)

      const cropScans = await CropScan.query()

      const farmerCropScans = cropScans.filter((scan) => scan.farmer_profile_id === farmer.id)
      const anotherFarmerCropScans = cropScans.filter(
        (scan) => scan.farmer_profile_id === anotherFarmer.id
      )

      response.assertBodyContains({
        data: farmerCropScans.map((cropScan) => ({
          id: cropScan.id,
          farmer_profile_id: cropScan.farmer_profile_id,
          crop: cropScan.crop,
          disease: cropScan.disease,
          created_at: cropScan.created_at.toISO(),
          links: {
            get_treatments: cropScan.disease
              ? {
                  method: 'GET',
                  href: `/api/v1/crop_scans/${cropScan.id}/treatments`,
                }
              : undefined,
          },
        })),
      })

      for (const data of responseData) {
        assert.notEqual(data.farmer_profile_id, anotherFarmer.id)

        assert.notInclude(anotherFarmerCropScans, data.id)
      }
    })
    .tags(['crop_scans', 'list_crop_scans'])
})
