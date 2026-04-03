import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import { cuid } from '@adonisjs/core/helpers'
import env from '#start/env'
import { AgroDealerProfileFactory } from '#database/factories/agro_dealer_profile_factory'
import AgroDealerProfile from '#models/agro_dealer_profile'

test.group('AgroDealer Profiles / Verify', (group) => {
  group.each.setup(async () => {
    await db.beginGlobalTransaction()

    return () => db.rollbackGlobalTransaction()
  })

  test('should verify an agro-dealer profile: {$self}')
    .with([
      'main_assertion',
      'not_authorized',
      'wrong_authorization',
      'agro_dealer_profile_not_found',
      'already_verified',
    ] as const)
    .run(async ({ assert, client, route }, condition) => {
      const profiles = await AgroDealerProfileFactory.with('user', 1, (userQuery) => {
        userQuery.apply('isAgroDealer')
      }).createMany(5)

      const targetProfile = profiles[2]

      if (condition === 'already_verified') {
        await targetProfile.merge({ is_verified: true }).save()
      }

      const response = await client
        .patch(
          route('api.v1.users.agro_dealer_profiles.verify', [
            targetProfile.user_id,
            condition === 'agro_dealer_profile_not_found' ? cuid() : targetProfile.id,
          ])
        )
        .header(
          'X-Admin-Secret',
          condition === 'not_authorized'
            ? ''
            : condition === 'wrong_authorization'
              ? 'wrong'
              : env.get('ADMIN_SECRET_KEY')
        )

      if (condition === 'not_authorized' || condition === 'wrong_authorization') {
        response.assertStatus(403)

        return response.assertBodyContains({ error: 'You are not authorized to view this.' })
      }

      if (condition === 'agro_dealer_profile_not_found') {
        response.assertStatus(404)

        return response.assertBodyContains({ error: 'AgroDealer not found.' })
      }

      // The request is idempotent so even if the dealer is already verified, an error is not returned
      response.assertStatus(200)

      response.assertBodyContains({
        message: 'AgroDealer verified successfully.',
        data: {
          id: targetProfile.id,
          business_name: targetProfile.business_name,
          is_verified: true,
        },
      })

      await targetProfile.refresh()

      assert.isTrue(targetProfile.is_verified)

      // Assert that others remain unverified
      const otherProfiles = await AgroDealerProfile.query().whereNot('id', targetProfile.id)

      for (const profile of otherProfiles) {
        assert.isFalse(profile.is_verified)
      }
    })
    .tags(['agro_dealers', 'verify_agro_dealer'])
})
