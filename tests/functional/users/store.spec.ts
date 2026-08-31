import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import User, { UserRolesEnum } from '#models/user'
import { sanitisePhoneNumber } from '#helpers/utils'

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
      'phone_number_not_valid',
      /**
       * @todo: test validation and other cases.
       */
    ] as const)
    .run(async ({ assert, client, route }, condition) => {
      let rawPhoneNumber = '+2348012345678' // We expect the validator to sanitise this

      if (condition === 'phone_number_not_valid') {
        rawPhoneNumber = rawPhoneNumber + '9' // Will exceed maxLength
      }

      const payload = {
        phone_number: rawPhoneNumber,
      }

      const sanitisedPhoneNumber = sanitisePhoneNumber(payload.phone_number)

      assert.notEqual(payload.phone_number, sanitisedPhoneNumber)

      if (
        condition === 'phone_number_already_in_use' ||
        condition === 'phone_number_exists_but_not_in_use'
      ) {
        await User.create({
          phone_number: sanitisedPhoneNumber,
          role: condition === 'phone_number_exists_but_not_in_use' ? null : UserRolesEnum.Farmer,
        })
      }

      const response = await client.post(route('api.v1.users.store')).json(payload)

      if (condition === 'phone_number_not_valid') {
        response.assertStatus(422)

        return response.assertBodyContains({
          errors: ['Phone Number is not valid.'],
        })
      }

      if (condition === 'phone_number_already_in_use') {
        response.assertStatus(400)

        return response.assertBodyContains({ error: 'Phone Number already in use for a profile.' })
      }

      response.assertStatus(201)

      const user = await User.query()
        .where({ phone_number: sanitisedPhoneNumber })
        .preload('OTP')
        .first()

      assert.exists(user)
      assert.equal(user!.phone_number, sanitisedPhoneNumber)

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
