import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import User, { UserRolesEnum } from '#models/user'
import hash from '@adonisjs/core/services/hash'
import OTP from '#models/otp'

test.group('Auth / Login', (group) => {
  group.each.setup(async () => {
    await db.beginGlobalTransaction()

    return () => db.rollbackGlobalTransaction()
  })

  test('should request login for a user: {$self}')
    .with([
      'main_assertion',
      /**
       * @todo: test validation and other cases.
       */
    ] as const)
    .run(async ({ assert, client, route }) => {
      const payload = {
        phone_number: '+2348012345678',
      }

      const user = await User.create({
        phone_number: payload.phone_number,
        role: UserRolesEnum.Farmer,
      })

      const response = await client.post(route('api.v1.login_request')).json(payload)

      response.assertStatus(200)

      response.assertBodyContains({
        message: 'OTP sent to your phone number.',
        data: {
          links: {
            verify_login: {
              method: 'POST',
              href: `/api/v1/auth/login_verify`,
            },
          },
        },
      })

      const responseData = response.body().data
      assert.exists(responseData?.OTP)

      await user.load('OTP')
      assert.isTrue(await hash.verify(user.OTP.code, responseData.OTP))
    })
    .tags(['auth', 'login', 'login_request'])

  test('should verify login for a user: {$self}')
    .with([
      'main_assertion',
      'otp_incorrect',
      /**
       * @todo: test validation and other cases.
       */
    ] as const)
    .run(async ({ assert, client, route }, condition) => {
      const user = await User.create({ phone_number: '+2348012345678', role: UserRolesEnum.Farmer })

      const otpCode = '123456'

      await OTP.create({
        code: otpCode,
        user_id: user.id,
      })

      const payload = {
        otp: condition === 'otp_incorrect' ? '000000' : otpCode,
        phone_number: user.phone_number,
      }

      const response = await client.post(route('api.v1.login_verify')).json(payload)

      if (condition === 'otp_incorrect') {
        response.assertStatus(401)

        return response.assertBodyContains({
          error: 'Invalid phone number or OTP.',
        })
      }

      response.assertStatus(200)

      response.assertBodyContains({
        message: 'Login successful.',
        data: {
          user: {
            id: user.id,
            role: user.role,
            phone_number: user.phone_number,
          },
        },
      })

      const responseData = response.body().data
      assert.exists(responseData?.token)
    })
    .tags(['auth', 'login', 'login_verify'])
})
