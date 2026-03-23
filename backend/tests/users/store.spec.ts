import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import User, { UserRolesEnum } from '#models/user'

test.group('Users / Store', (group) => {
  group.each.setup(async () => {
    await db.beginGlobalTransaction()

    return () => db.rollbackGlobalTransaction()
  })

  test('should create a user: {$self}')
    .with([
      'main_assertion',
      'phone_number_already_in_use',
      'phone_number_exists_but_not_in_use',
      /**
       * @todo: test validation and other cases.
       */
    ] as const)
    .run(async ({ assert, client, route }, condition) => {
      const payload = {
        phone_number: '+2348012345678',
      }

      if (
        condition === 'phone_number_already_in_use' ||
        condition === 'phone_number_exists_but_not_in_use'
      ) {
        await User.create({
          phone_number: payload.phone_number,
          role: condition === 'phone_number_exists_but_not_in_use' ? null : UserRolesEnum.Farmer,
        })
      }

      const response = await client.post(route('api.v1.users.store')).json(payload)

      if (condition === 'phone_number_already_in_use') {
        response.assertStatus(400)

        return response.assertBodyContains({ error: 'Phone Number already in use for a profile.' })
      }

      response.assertStatus(201)

      const user = await User.query()
        .where({ phone_number: payload.phone_number })
        .preload('OTP')
        .first()

      assert.exists(user)
      assert.equal(user!.phone_number, payload.phone_number)

      await user!.load('OTP')
      assert.exists(user!.OTP)

      response.assertBodyContains({
        message: 'OTP sent to your phone number.',
        data: {
          user: { id: user!.id, phone_number: user!.phone_number },
          links: {
            create_farmer_profile: {
              method: 'POST',
              href: `/api/v1/users/${user!.id}/farmer_profiles`,
            },
            create_agro_dealer_profile: {
              method: 'POST',
              href: `/api/v1/users/${user!.id}/agro_dealer_profiles`,
            },
          },
        },
      })

      const responseData = response.body().data
      assert.exists(responseData.OTP)
      assert.lengthOf(responseData.OTP, 6)

      // Assert that the stored OTP is hashed
      assert.notEqual(user!.OTP.code, responseData.OTP)
    })
    .tags(['users', 'create_user'])
})
