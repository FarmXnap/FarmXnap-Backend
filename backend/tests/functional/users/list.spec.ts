import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import { UserFactory } from '#database/factories/user_factory'
import { ModelObject } from '@adonisjs/lucid/types/model'
import env from '#start/env'

test.group('Users / List', (group) => {
  group.each.setup(async () => {
    await db.beginGlobalTransaction()

    return () => db.rollbackGlobalTransaction()
  })

  test('should list users (farmer and agro-dealer profiles): {$self}')
    .with(['main_assertion', 'not_authorized', 'wrong_authorization'] as const)
    .run(async ({ assert, client, route }, condition) => {
      assert.isEmpty(await User.query())

      const farmerProfiles = await UserFactory.apply('isFarmer')
        .with('farmerProfile')
        .createMany(10)

      const nonVerifiedAgroDealerProfiles = await UserFactory.apply('isAgroDealer')
        .with('agroDealerProfile')
        .createMany(5)
      const verifiedAgroDealerProfiles = await UserFactory.apply('isAgroDealer')
        .with('agroDealerProfile', 1, (agroDealerProfileQuery) => {
          agroDealerProfileQuery.apply('isVerified')
        })
        .createMany(5)

      // Create users without roles to assert that they are not returned
      const orphanedUsers = await UserFactory.createMany(5)

      await Promise.all(
        [...farmerProfiles, ...verifiedAgroDealerProfiles, ...nonVerifiedAgroDealerProfiles].map(
          async (profile) => {
            await profile.load('farmerProfile')
            await profile.load('agroDealerProfile')
          }
        )
      )

      const farmerProfilesToBeReturned = farmerProfiles.map((user) => ({
        id: user.id,
        phone_number: user.phone_number,
        role: user.role,
        farmerProfile: {
          id: user.farmerProfile.id,
          user_id: user.id,
          full_name: user.farmerProfile.full_name,
          state: user.farmerProfile.state,
          lga: user.farmerProfile.lga,
          primary_crop: user.farmerProfile.primary_crop,
          created_at: user.farmerProfile.created_at.toISO(),
          updated_at: user.farmerProfile.updated_at.toISO(),
        },
        agroDealerProfile: null,
        links: {},
      }))

      const agroDealerProfilesToBeReturned = [
        ...verifiedAgroDealerProfiles,
        ...nonVerifiedAgroDealerProfiles,
      ].map((user) => ({
        id: user.id,
        phone_number: user.phone_number,
        role: user.role,
        farmerProfile: null,
        agroDealerProfile: {
          id: user.agroDealerProfile.id,
          user_id: user.id,
          business_name: user.agroDealerProfile.business_name,
          cac_registration_number: user.agroDealerProfile.cac_registration_number,
          state: user.agroDealerProfile.state,
          is_verified: user.agroDealerProfile.is_verified,
          created_at: user.agroDealerProfile.created_at.toISO(),
          updated_at: user.agroDealerProfile.updated_at.toISO(),
        },
        links: {
          verify_agro_dealer: {
            method: 'PATCH',
            href: `/api/v1/users/${user.id}/agro_dealer_profiles/${user.agroDealerProfile.id}/verify`,
          },
        },
      }))

      const response = await client
        .get(route('api.v1.users.index'))
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

      response.assertStatus(200)

      const responseData: ModelObject[] = response.body().data

      assert.lengthOf(
        responseData,
        farmerProfiles.length +
          verifiedAgroDealerProfiles.length +
          nonVerifiedAgroDealerProfiles.length
      )

      response.assertBodyContains({
        data: [...farmerProfilesToBeReturned, ...agroDealerProfilesToBeReturned],
      })

      const responseDataIds = responseData.map((data) => data.id)

      for (const user of orphanedUsers) {
        assert.notInclude(responseDataIds, user.id)
      }
    })
    .tags(['users', 'list_users'])
})
