import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import { FarmerProfileFactory } from '#database/factories/farmer_profile_factory'
import { AgroDealerProfileFactory } from '#database/factories/agro_dealer_profile_factory'
import app from '@adonisjs/core/services/app'
import sinon from 'sinon'
import fs from 'node:fs/promises'
import crypto from 'node:crypto'
import CropScan from '#models/crop_scan'

const heavyFilePath = app.makePath('tmp', 'tests', 'too_large.jpg')

test.group('Farmer Profiles / Crop Scans / Treatments', (group) => {
  group.each.setup(async () => {
    await db.beginGlobalTransaction()

    return async () => {
      await db.rollbackGlobalTransaction()

      sinon.restore()
    }
  })

  group.setup(async () => {
    const bigBuffer = crypto.randomBytes(1024 * 1024 * 11) // 11mb file
    await fs.writeFile(heavyFilePath, bigBuffer)
  })

  group.teardown(async () => {
    // Clean up
    try {
      await fs.unlink(heavyFilePath)
    } catch {}
  })

  test('should get crop scan treatments: {$self}')
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

      const cropScan = await CropScan.create({
        crop: 'Maize',
        disease: 'Eyespot',
        category: 'Fungicide',
        active_ingredient: 'Azoxystrobin',
        search_term: 'Maize small yellow leaf spots',
        instructions:
          'Apply a recommended fungicide containing active ingredients like Azoxystrobin to control the spread of the disease.',
      })

      const response = await client
        .get(route('api.v1.farmer_profiles.crop_scans.treatments', [farmer.id, cropScan.id]))
        .bearerToken(tokenValue)

      response.assertStatus(200)
    })
    .tags(['farmer_profiles', 'crop_scans', 'treatments'])
    // .pin()
  // .timeout(30000)
})
