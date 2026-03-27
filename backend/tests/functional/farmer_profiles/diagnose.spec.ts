import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import { FarmerProfileFactory } from '#database/factories/farmer_profile_factory'
import { AgroDealerProfileFactory } from '#database/factories/agro_dealer_profile_factory'
import { ProductFactory } from '#database/factories/product_factory'
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

const heavyFilePath = app.makePath('tmp', 'tests', 'too_large.jpg')

test.group('Farmer Profiles / Diagnose', (group) => {
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
        await ProductFactory.merge({
          agro_dealer_profile_id: dealer.id,
          category: 'Fertilizer',
          name: 'Muriate of Potash',
          active_ingredient: 'Potassium',
          description:
            'Muriate of Potash (MOP) is a high-potassium fertilizer, typically containing 60% potash, used to strengthen plant roots, improve water retention, and increase fruit size and sweetness in crops like yam, cassava, and cocoa.',
          target_problems: 'Boosts root strength and fruit yield.',
        }).create()

        await ProductFactory.merge({
          agro_dealer_profile_id: dealer.id,
          name: 'Mancozeb 80WP',
          active_ingredient: 'Mancozeb 80WP',
          category: 'Fungicide',
          description: 'A protective wettable powder for maize and other cereal crops...',
          target_problems: 'Maize leaf spot, blight, and rust',
        }).create()

        await ProductFactory.merge({
          agro_dealer_profile_id: dealer.id,
          name: 'Copper Oxychloride 50WP',
          active_ingredient: 'Copper Oxychloride',
          description:
            'An inorganic copper-based powder that stays on the leaf surface to kill fungal and bacterial cells upon contact.',
          category: 'Fungicide',
          target_problems: 'Maize bacterial spots, black pod disease, and downy mildew.',
        }).create()

        await ProductFactory.merge({
          agro_dealer_profile_id: dealer.id,
          name: 'Azoxystrobin',
          active_ingredient: 'Azoxystrobin',
          category: 'Fungicide',
          description: 'Systemic protection for maize leaves against aggressive fungal infections.',
          target_problems: 'Maize eyespot, rust, rice blast, and powdery mildew.',
        }).create()
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
        .post(route('api.v1.farmer_profiles.diagnose', [farmer.id]))
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

      if (condition === 'image_is_not_crop') {
        response.assertStatus(400)

        return response.assertBodyContains({ error: mockAiResponseNonCrop.instructions })
      }

      response.assertStatus(200)

      if (condition === 'image_is_healthy_crop') {
        return response.assertBodyContains({
          data: {
            diagnosis: {
              instructions: mockAiResponseHealthyCrop.instructions,
              crop: mockAiResponseHealthyCrop.crop,
            },
          },
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

      const treatments: ModelObject[] = responseData.treatments

      // Assert likely number of responses (treatments)
      assert.isAtLeast(treatments.length, 2)
      assert.isAtMost(treatments.length, 3)

      for (const data of treatments) {
        assert.properties(data, [
          'id',
          'name',
          'active_ingredient',
          'price',
          'stock_quantity',
          'unit',
          'description',
          'category',
          'target_problems',
          'business_name',
          'business_address',
          'state',
          'bank_name',
          'bank_account_number',
          'bank_account_name',
          'phone_number',
          'rank',
          'links',
        ])

        // Assert that the products from the unverified dealer were not returned
        assert.equal(data.business_name, agroDealers[1].business_name)
        assert.notEqual(data.business_name, agroDealers[0].business_name)

        // Assert that the product in "Fertilizer" category was not returned
        assert.equal(data.category, 'Fungicide')
        assert.notEqual(data.category, 'Fertilizer')

        // Assert the links
        assert.containSubset(data.links, {
          create_order: {
            method: 'POST',
            href: `/api/v1/products/${data.id}/orders`,
          },
        })
      }

      // Assert that the highest match "Azoxystrobin" is returned first
      assert.equal(treatments[0].name, 'Azoxystrobin')
    })
    .tags(['farmer_profiles', 'diagnose'])
  // .timeout(30000)
})
