import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import { faker } from '@faker-js/faker'
import User, { UserRolesEnum } from '#models/user'
import OTP from '#models/otp'
import { cuid } from '@adonisjs/core/helpers'

test.group('Farmer Profiles / Store', (group) => {
  group.each.setup(async () => {
    await db.beginGlobalTransaction()

    return () => db.rollbackGlobalTransaction()
  })

  test('should create a farmer profile: {$self}')
    .with([
      'main_assertion',
      'otp_incorrect',
      'user_not_found',
      'transaction_pin_not_appropriate_length',
      /**
       * @todo: test validation and other cases.
       */
    ] as const)
    .run(async ({ assert, client, route }, condition) => {
      const user = await User.create({ phone_number: '+2348012345678' })

      const otpCode = '123456'

      await OTP.create({
        code: otpCode,
        user_id: user.id,
      })

      const payload = {
        otp: condition === 'otp_incorrect' ? '000000' : otpCode,
        email: faker.internet.email(),
        password: faker.lorem.word({ length: { min: 8, max: 10 } }),
        full_name: faker.person.firstName(),
        state: faker.location.state(),
        lga: faker.location.county(),
        address: faker.location.streetAddress(),
        primary_crop: faker.lorem.word(),
        transaction_pin: condition === 'transaction_pin_not_appropriate_length' ? '123' : '1234',
      }

      const response = await client
        .post(
          route('api.v1.users.farmer_profiles.store', [
            condition === 'user_not_found' ? cuid() : user.id,
          ])
        )
        .json(payload)

      if (condition === 'transaction_pin_not_appropriate_length') {
        response.assertStatus(422)

        return response.assertBodyContains({
          errors: ['Transaction Pin must be 4 digits.'],
        })
      }

      if (condition === 'user_not_found') {
        response.assertStatus(404)
        return response.assertBodyContains({
          error: 'User not found.',
        })
      }

      if (condition === 'otp_incorrect') {
        response.assertStatus(400)
        return response.assertBodyContains({
          error: 'OTP is incorrect.',
        })
      }

      response.assertStatus(201)

      await user.refresh()
      assert.equal(user.role, UserRolesEnum.Farmer)

      // Assert that the transaction pin is hashed
      const trxPin = (await db.from('users').where('id', user.id).firstOrFail()).transaction_pin

      assert.exists(trxPin)
      assert.notEqual(trxPin, payload.transaction_pin)

      await user.load('farmerProfile')
      assert.exists(user!.farmerProfile)

      response.assertBodyContains({
        message: 'You have successfully registered as a farmer.',
        data: {
          user: { id: user!.id, role: UserRolesEnum.Farmer },
        },
      })

      assert.exists(response.body().data.token)

      assert.containSubset(user!.farmerProfile, {
        full_name: payload.full_name,
        state: payload.state,
        lga: payload.lga,
        primary_crop: payload.primary_crop,
        user_id: user!.id,
        address: payload.address,
      })
    })
    .tags(['farmer_profiles', 'create_farmer_profile'])
})
