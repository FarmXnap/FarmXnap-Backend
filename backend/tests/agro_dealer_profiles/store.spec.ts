import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import { faker } from '@faker-js/faker'
import User, { UserRolesEnum } from '#models/user'
import OTP from '#models/otp'
import { cuid } from '@adonisjs/core/helpers'

test.group('AgroDealer Profiles / Store', (group) => {
  group.each.setup(async () => {
    await db.beginGlobalTransaction()

    return () => db.rollbackGlobalTransaction()
  })

  test('should create an agro-dealer profile: {$self}')
    .with([
      'main_assertion',
      'otp_incorrect',
      'user_not_found',
      'transaction_pin_not_appropriate_length',
      'account_number_not_appropriate_length',
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
        business_name: faker.company.name(),
        business_address: faker.location.streetAddress(),
        state: faker.location.state(),
        cac_registration_number: faker.lorem.word(),
        bank: faker.company.name(),
        account_number:
          condition === 'account_number_not_appropriate_length'
            ? '12345678901'
            : faker.lorem.word({ length: { min: 10, max: 10 } }),
        transaction_pin: condition === 'transaction_pin_not_appropriate_length' ? '123' : '1234',
      }

      const response = await client
        .post(
          route('api.v1.users.agro_dealer_profiles.store', [
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

      if (condition === 'account_number_not_appropriate_length') {
        response.assertStatus(422)

        return response.assertBodyContains({
          errors: ['Account Number must be 10 digits.'],
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
      assert.equal(user.role, UserRolesEnum.AgroDealer)

      // Assert that the transaction pin is hashed
      const trxPin = (await db.from('users').where('id', user.id).firstOrFail()).transaction_pin

      assert.exists(trxPin)
      assert.notEqual(trxPin, payload.transaction_pin)

      await user.load('agroDealerProfile')
      assert.exists(user!.agroDealerProfile)

      response.assertBodyContains({
        message: 'You have successfully registered as an agro-dealer.',
        data: {
          user: { id: user!.id, role: UserRolesEnum.AgroDealer },
        },
      })

      assert.exists(response.body().data.token)

      assert.containSubset(user!.agroDealerProfile, {
        business_name: payload.business_name,
        business_address: payload.business_address,
        account_number: payload.account_number,
        bank: payload.bank,
        cac_registration_number: payload.cac_registration_number,
        state: payload.state,
        user_id: user!.id,
      })
    })
    .tags(['agro_dealers', 'create_agro_dealer'])
})
