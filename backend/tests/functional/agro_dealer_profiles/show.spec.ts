import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import { cuid } from '@adonisjs/core/helpers'
import { FarmerProfileFactory } from '#database/factories/farmer_profile_factory'
import { AgroDealerProfileFactory } from '#database/factories/agro_dealer_profile_factory'

test.group('AgroDealer Profiles / Show', (group) => {
  group.each.setup(async () => {
    await db.beginGlobalTransaction()

    return () => db.rollbackGlobalTransaction()
  })

  test('should show an agro-dealer profile: {$self}')
    .with(['main_assertion', 'not_logged_in', 'not_agro_dealer', 'incorrect_id_in_params'] as const)
    .run(async ({ client, route }, condition) => {
      const agroDealers = await AgroDealerProfileFactory.apply('isVerified')
        .with('user', 1, (userQuery) => {
          userQuery.apply('isAgroDealer')
        })
        .createMany(2)

      const farmer = await FarmerProfileFactory.with('user', 1, (userQuery) => {
        userQuery.apply('isFarmer')
      }).create()

      const targetDealer = agroDealers[1]

      await Promise.all([
        await Promise.all(agroDealers.map(async (dealer) => await dealer.load('user'))),
        farmer.load('user'),
      ])

      let tokenValue = ''
      if (condition !== 'not_logged_in') {
        // Simulate login
        const token = await User.accessTokens.create(
          condition === 'not_agro_dealer' ? farmer.user : targetDealer.user
        )

        tokenValue = token.value!.release()
      }

      const response = await client
        .get(
          route('api.v1.users.agro_dealer_profiles.show', [
            targetDealer.user_id,
            condition === 'incorrect_id_in_params' ? cuid() : targetDealer.id,
          ])
        )
        .bearerToken(tokenValue)

      if (condition === 'not_logged_in') {
        response.assertStatus(401)

        return response.assertBodyContains({ error: 'Unauthorized access' })
      }

      if (condition === 'not_agro_dealer') {
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
          id: targetDealer.user.id,
          role: targetDealer.user.role,
          phone_number: targetDealer.user.phone_number,
          agroDealerProfile: {
            id: targetDealer.id,
            user_id: targetDealer.user_id,
            business_name: targetDealer.business_name,
            business_address: targetDealer.business_address,
            state: targetDealer.state,
            lga: targetDealer.lga,
            cac_registration_number: targetDealer.cac_registration_number,
            bank: targetDealer.bank,
            account_number: targetDealer.account_number,
            is_verified: targetDealer.is_verified,
            created_at: targetDealer.created_at.toISO(),
            updated_at: targetDealer.updated_at.toISO(),
          },
        },
      })
    })
    .tags(['agro_dealer_profiles', 'show_agro_dealer_profile'])
})
