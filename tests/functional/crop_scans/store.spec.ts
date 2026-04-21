import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import { FarmerProfileFactory } from '#database/factories/farmer_profile_factory'
import { AgroDealerProfileFactory } from '#database/factories/agro_dealer_profile_factory'
import app from '@adonisjs/core/services/app'
import { ModelObject } from '@adonisjs/lucid/types/model'
import sinon from 'sinon'
import AiService, {
  mockAiResponseDiseasedCrop,
  mockAiResponseHealthyCrop,
  mockAiResponseNonCrop,
} from '#services/ai_service'
import fs from 'node:fs/promises'
import crypto from 'node:crypto'
import { cropTreatmentResult } from '../../../helpers/crop_scan_helper.js'
import CropScan from '#models/crop_scan'
import {
  assertTreatmentResults,
  createProductsForAgroDealer,
} from '../../../helpers/test_helper.js'

const heavyFilePath = app.makePath('tmp', 'tests', 'too_large.jpg')

test.group('Crop Scans / Store', (group) => {
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

  test(
    'should scan an image, diagnose crop disease and return results of verified agrodealers with treatment: {$self}'
  )
    .with([
      'main_assertion',
      'not_logged_in',
      'not_farmer',
      'image_is_not_crop',
      'image_is_healthy_crop',
      'image_not_provided',
      'image_extname_not_supported',
      'image_size_exceeded',
    ] as const)
    .run(async ({ assert, client, route }, condition) => {
      // Stub the AI service and mock the response
      sinon
        .stub(AiService, 'diagnose')
        .resolves(
          condition === 'image_is_healthy_crop'
            ? mockAiResponseHealthyCrop
            : condition === 'image_is_not_crop'
              ? mockAiResponseNonCrop
              : mockAiResponseDiseasedCrop
        )

      const farmer = await FarmerProfileFactory.with('user', 1, (userQuery) => {
        userQuery.apply('isFarmer')
      }).create()

      const agroDealers = await AgroDealerProfileFactory.with('user', 1, (userQuery) => {
        userQuery.apply('isAgroDealer')
      }).createMany(2)

      await agroDealers[1].merge({ is_verified: true }).save()

      for (const dealer of agroDealers) {
        await createProductsForAgroDealer(dealer.id)
      }

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

      const response = await client
        .post(route('api.v1.crop_scans.store'))
        .file(
          condition === 'image_not_provided' ? '' : 'image',
          condition === 'image_size_exceeded'
            ? heavyFilePath
            : condition === 'image_extname_not_supported'
              ? app.makePath('package.json')
              : app.makePath(
                  'tests',
                  condition === 'image_is_healthy_crop'
                    ? 'healthy-maize-leaf-preview.jpg'
                    : condition === 'image_is_not_crop'
                      ? 'profile_pic.jpg'
                      : 'maize_with_spots.jpeg'
                )
        )
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

      if (condition === 'image_extname_not_supported') {
        response.assertStatus(422)

        return response.assertBodyContains({
          errors: [
            `Image extension is not supported. Only jpg, jpeg, png, webp, heic, heif are supported.`,
          ],
        })
      }

      if (condition === 'image_size_exceeded') {
        response.assertStatus(422)

        return response.assertBodyContains({ errors: [`Image size must not exceed 10mb.`] })
      }

      if (condition === 'image_not_provided') {
        response.assertStatus(422)

        return response.assertBodyContains({ errors: [`Image is required.`] })
      }

      const cropsScans = await CropScan.query()

      if (condition === 'image_is_not_crop') {
        response.assertStatus(400)

        assert.isEmpty(cropsScans)

        return response.assertBodyContains({ error: mockAiResponseNonCrop.instructions })
      }

      response.assertStatus(200)

      // Assert that a crop scan record is created
      assert.lengthOf(cropsScans, 1)

      if (condition === 'image_is_healthy_crop') {
        response.assertBodyContains({
          data: {
            diagnosis: {
              instructions: mockAiResponseHealthyCrop.instructions,
              crop: mockAiResponseHealthyCrop.crop,
            },
          },
        })

        return assert.containSubset(cropsScans[0], {
          // For healthy crop, some fields are null
          disease: null,
          search_term: null,
          active_ingredient: null,
          category: null,

          crop: mockAiResponseHealthyCrop.crop,
          instructions: mockAiResponseHealthyCrop.instructions,
        })
      }

      const responseData: ModelObject = response.body().data

      assert.containSubset(responseData, {
        diagnosis: {
          crop: mockAiResponseDiseasedCrop.crop,
          disease: mockAiResponseDiseasedCrop.disease,
          instructions: mockAiResponseDiseasedCrop.instructions,
        },
      })

      const treatments: cropTreatmentResult[] = responseData.treatments

      // Assert treatment results
      await assertTreatmentResults({
        verifiedDealer: agroDealers[1],
        unVerifiedDealer: agroDealers[0],
        assert,
        treatments,
      })

      // Assert the crop scan record
      assert.containSubset(cropsScans[0], {
        search_term: mockAiResponseDiseasedCrop.search_term,
        active_ingredient: mockAiResponseDiseasedCrop.active_ingredient,
        crop: mockAiResponseDiseasedCrop.crop,
        disease: mockAiResponseDiseasedCrop.disease,
        instructions: mockAiResponseDiseasedCrop.instructions,
        category: mockAiResponseDiseasedCrop.category,
      })
    })
    .tags(['crop_scans', 'create_crop_scan', 'diagnose'])
  // .timeout(30000)
})
