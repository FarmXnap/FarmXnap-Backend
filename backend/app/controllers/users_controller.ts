import User from '#models/user'
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { rules, schema } from '@adonisjs/validator'
import { generateOtp } from '../../helpers/utils.js'
import router from '@adonisjs/core/services/router'

export default class UsersController {
  /**
   * Initialize a user.
   *
   * `POST /api/v1/users`
   */
  public async store({ request, response }: HttpContext) {
    const { phone_number: phoneNumber } = await request.validate({
      schema: schema.create({
        phone_number: schema.string([rules.trim(), rules.escape(), rules.mobile()]),
        // email: schema.string([...stringRules, rules.email()]),
        // password: schema.string([rules.minLength(8)]),
      }),
      messages: {
        'phone_number.required': 'Phone Number is required.',
        'phone_number.mobile': 'Phone Number is not valid.',
        // 'email.required': 'Email is required.',
        // 'email.email': 'Email is not valid.',
        // 'password.required': 'Password is required.',
        // 'password.minLength': 'Password must be at least 8 characters.',
      },
    })

    if (await db.from('users').where({ phone_number: phoneNumber }).whereNotNull('role').first()) {
      return response.badRequest({ error: 'Phone Number already in use for a profile.' })
    }

    const otpCode = generateOtp()

    const user = await db.transaction(async (trx) => {
      /**
       * If the phone number already exists but has not been assigned a role, the user did not complete the registration process. Start the process again.
       */
      const user = await User.updateOrCreate({ phone_number: phoneNumber }, {}, { client: trx })

      await user.related('OTP').updateOrCreate(
        { user_id: user.id },
        {
          code: otpCode,
        },
        { client: trx }
      )

      return user
    })

    return response.created({
      message: 'OTP sent to your phone number.',
      data: {
        user: {
          id: user.id,
          phone_number: user.phone_number,
        },
        OTP: otpCode,
        links: {
          create_farmer_profile: {
            method: 'POST',
            href: router.makeUrl('api.v1.users.farmer_profiles.store', [user.id]),
          },
          create_agro_dealer_profile: {
            method: 'POST',
            href: router.makeUrl('api.v1.users.agro_dealer_profiles.store', [user.id]),
          },
        },
      },
    })
  }
}
