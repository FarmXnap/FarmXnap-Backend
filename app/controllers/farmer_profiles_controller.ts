import User, { UserRolesEnum } from '#models/user'
import type { HttpContext } from '@adonisjs/core/http'
import { schema } from '@adonisjs/validator'
import hash from '@adonisjs/core/services/hash'
import db from '@adonisjs/lucid/services/db'
import { rules } from '#services/validator_rules'
import router from '@adonisjs/core/services/router'

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

    const stringRules = [rules.trim(), rules.stripTags()]

    const {
      otp,
      full_name: fullName,
      state,
      lga,
      address,
      primary_crop: primaryCrop,
      transaction_pin: transactionPin,
    } = await request.validate({
      schema: schema.create({
        otp: schema.string(stringRules),
        full_name: schema.string(stringRules),
        state: schema.string(stringRules),
        lga: schema.string(stringRules),
        address: schema.string(stringRules),
        primary_crop: schema.string(stringRules),
        transaction_pin: schema.string([...stringRules, rules.minLength(4), rules.maxLength(4)]),
      }),
      messages: {
        'otp.required': 'OTP is required.',

        'full_name.required': 'Full Name is required.',
        'state.required': 'State is required.',
        'lga.required': 'LGA is required.',
        'address.required': 'Address is required.',
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
          address,
          primary_crop: primaryCrop,
        },
        { client: trx }
      )
    })

    const token = await User.accessTokens.create(user)

    await user.load('farmerProfile')

    return response.created({
      message: 'You have successfully registered as a farmer.',
      data: {
        // Client should save this token immediately in localStorage or a secure cookie, for automatic login after registration.
        token: token.value?.release(),
        user: {
          id: user.id,
          role: user.role,
        },
        links: {
          view: {
            method: 'GET',
            href: router.makeUrl('api.v1.users.farmer_profiles.show', [
              user.id,
              user.farmerProfile.id,
            ]),
          },
        },
      },
    })
  }

  /**
   * Show a farmer profile.
   *
   * `GET /api/v1/users/:user_id/farmer_profiles/:id`
   */
  public async show({ response, params, auth }: HttpContext) {
    const user = auth.user!

    await user.load('farmerProfile', (farmerProfileQuery) => {
      farmerProfileQuery.select([
        'id',
        'user_id',
        'full_name',
        'state',
        'lga',
        'address',
        'primary_crop',
        'created_at',
        'updated_at',
      ])
    })

    // Match params agains authenticated data. To throw off anyone playing with ids in the url.
    if (params.user_id !== user.id || params.id !== user.farmerProfile?.id) {
      return response.forbidden({
        error: 'You are not authorized to view this profile.',
      })
    }

    return response.ok({
      data: {
        id: user.id,
        phone_number: user.phone_number,
        role: user.role,
        farmerProfile: user.farmerProfile,
        /**
         * @todo: Decide whether to return the crop scan store endpoint in links.
         */
      },
    })
  }
}
