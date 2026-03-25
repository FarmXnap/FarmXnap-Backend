import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import { FarmerProfileFactory } from '#database/factories/farmer_profile_factory'
import { AgroDealerProfileFactory } from '#database/factories/agro_dealer_profile_factory'
import { ProductFactory } from '#database/factories/product_factory'
import app from '@adonisjs/core/services/app'
import { ModelObject } from '@adonisjs/lucid/types/model'
import nock from 'nock'
import { mockAiResponse } from '../../../helpers/test_helper.js'
import sinon from 'sinon'
import AiService from '#services/ai_service'

nock.enableNetConnect()

test.group('Farmer Profiles / Diagnose', (group) => {
  group.each.setup(async () => {
    await db.beginGlobalTransaction()

    return async () => {
      await db.rollbackGlobalTransaction()

      sinon.restore()
    }
  })

  test(
    'should scan an image, diagnose crop disease and return results of verified agrodealers with treatment: {$self}'
  )
    .with(['main_assertion'] as const)
    .run(async ({ assert, client, route }) => {
      // Stub the AI service and mock the response
      sinon.stub(AiService, 'diagnose').resolves(mockAiResponse)

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

      await farmer.load('user')
      const token = await User.accessTokens.create(farmer.user)
      const tokenValue = token.value!.release()

      const response = await client
        .post(route('api.v1.farmer_profiles.diagnose', [farmer.id]))
        .file('image', app.makePath('tests', 'maize_with_spots.jpeg'))
        .bearerToken(tokenValue)

      response.dumpBody()

      const responseData: ModelObject[] = response.body().data

      // Assert likely number of responses
      assert.isAtLeast(responseData.length, 2)
      assert.isAtMost(responseData.length, 3)

      for (const data of responseData) {
        assert.properties(data, [
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
          'bank',
          'account_number',
          'phone_number',
          'rank',
        ])

        // Assert that the products from the unverified dealer were not returned
        assert.equal(data.business_name, agroDealers[1].business_name)
        assert.notEqual(data.business_name, agroDealers[0].business_name)

        // Assert that the product in "Fertilizer" category was not returned
        assert.equal(data.category, 'Fungicide')
        assert.notEqual(data.category, 'Fertilizer')
      }

      // Assert that the highest match "Azoxystrobin" is returned first
      assert.equal(responseData[0].name, 'Azoxystrobin')
    })
    .tags(['farmer_profiles', 'diagnose'])
  // .timeout(30000)
  // .pin()
})
