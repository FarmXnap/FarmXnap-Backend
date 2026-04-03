import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import { cuid } from '@adonisjs/core/helpers'
import { FarmerProfileFactory } from '#database/factories/farmer_profile_factory'
import { AgroDealerProfileFactory } from '#database/factories/agro_dealer_profile_factory'

test.group('Farmer Profiles / Show', (group) => {
  group.each.setup(async () => {
    await db.beginGlobalTransaction()

    return () => db.rollbackGlobalTransaction()
  })

  test('should show a farmer profile: {$self}')
    .with(['main_assertion', 'not_logged_in', 'not_farmer', 'incorrect_id_in_params'] as const)
    .run(async ({ client, route }, condition) => {
      const farmers = await FarmerProfileFactory.with('user', 1, (userQuery) => {
        userQuery.apply('isFarmer')
      }).createMany(2)

      const agroDealer = await AgroDealerProfileFactory.with('user', 1, (userQuery) => {
        userQuery.apply('isAgroDealer')
      }).create()

      const targetFarmer = farmers[1]

      await Promise.all([
        await Promise.all(farmers.map(async (farmer) => await farmer.load('user'))),
        agroDealer.load('user'),
      ])

      let tokenValue = ''
      if (condition !== 'not_logged_in') {
        // Simulate login
        const token = await User.accessTokens.create(
          condition === 'not_farmer' ? agroDealer.user : targetFarmer.user
        )

        tokenValue = token.value!.release()
      }
      const response = await client
        .get(
          route('api.v1.users.farmer_profiles.show', [
            targetFarmer.user_id,
            condition === 'incorrect_id_in_params' ? cuid() : targetFarmer.id,
          ])
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

      if (condition === 'incorrect_id_in_params') {
        response.assertStatus(403)

        return response.assertBodyContains({
          error: 'You are not authorized to view this profile.',
        })
      }

      response.assertStatus(200)

      response.assertBodyContains({
        data: {
          id: targetFarmer.user.id,
          role: targetFarmer.user.role,
          phone_number: targetFarmer.user.phone_number,
          farmerProfile: {
            id: targetFarmer.id,
            user_id: targetFarmer.user_id,
            full_name: targetFarmer.full_name,
            state: targetFarmer.state,
            lga: targetFarmer.lga,
            address: targetFarmer.address,
            primary_crop: targetFarmer.primary_crop,
            created_at: targetFarmer.created_at.toISO(),
            updated_at: targetFarmer.updated_at.toISO(),
          },
        },
      })
    })
    .tags(['farmer_profiles', 'show_farmer_profile'])
})
