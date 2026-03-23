import User, { UserRolesEnum } from '#models/user'
import type { HttpContext } from '@adonisjs/core/http'
import { rules, schema } from '@adonisjs/validator'
import hash from '@adonisjs/core/services/hash'
import db from '@adonisjs/lucid/services/db'

export default class FarmerProfilesController {
  /**
   * Create a farmer profile.
   *
   * `POST /api/v1/users/:user_id/farmer_profiles`
   */
  public async store({ request, response, params }: HttpContext) {
    const user = await User.query()
      .select(['id', 'role'])
      .preload('OTP', (otpQuery) => {
        otpQuery.select(['code'])
      })
      .where({ id: params.user_id })
      .first()

    if (!user || !user.OTP) {
      return response.notFound({
        error: 'User not found.',
      })
    }

    const stringRules = [rules.trim(), rules.escape()]

    const {
      otp,
      full_name: fullName,
      state,
      lga,
      primary_crop: primaryCrop,
      transaction_pin: transactionPin,
    } = await request.validate({
      schema: schema.create({
        otp: schema.string(stringRules),
        full_name: schema.string(stringRules),
        state: schema.string(stringRules),
        lga: schema.string.optional(stringRules),
        primary_crop: schema.string(stringRules),
        transaction_pin: schema.string([...stringRules, rules.minLength(4), rules.maxLength(4)]),
      }),
      messages: {
        'otp.required': 'OTP is required.',

        'full_name.required': 'Full Name is required.',
        'state.required': 'State is required.',
        'primary_crop.required': 'Primary Crop is required.',
        'transaction_pin.required': 'Transaction Pin is required.',
        'transaction_pin.minLength': 'Transaction Pin must be 4 digits.',
        'transaction_pin.maxLength': 'Transaction Pin must be 4 digits.',
      },
    })

    // Verify the OTP hash
    const isCorrect = await hash.verify(user.OTP.code, otp)

    if (!isCorrect) {
      return response.badRequest({ error: 'OTP is incorrect.' })
    }

    await db.transaction(async (trx) => {
      await user
        .merge({ role: UserRolesEnum.Farmer, transaction_pin: transactionPin })
        .useTransaction(trx)
        .save()

      await user.related('farmerProfile').create(
        {
          full_name: fullName,
          state,
          lga,
          primary_crop: primaryCrop,
        },
        { client: trx }
      )
    })

    const token = await User.accessTokens.create(user)

    return response.created({
      message: 'You have successfully registered as a farmer.',
      data: {
        // Client should save this token immediately in localStorage or a secure cookie, for automatic login after registration.
        token: token.value?.release(),
        user: {
          id: user.id,
          role: user.role,
        },
      },
    })
  }
}
