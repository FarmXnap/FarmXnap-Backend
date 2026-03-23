import User, { UserRolesEnum } from '#models/user'
import type { HttpContext } from '@adonisjs/core/http'
import { rules, schema } from '@adonisjs/validator'
import hash from '@adonisjs/core/services/hash'
import db from '@adonisjs/lucid/services/db'
import AgroDealerProfile from '#models/agro_dealer_profile'

export default class AgroDealerProfilesController {
  /**
   * Create an agro-dealer profile.
   *
   * `POST /api/v1/users/:user_id/agro_dealer_profiles`
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
      business_name: businessName,
      cac_registration_number: cacRegNumber,
      business_address: businessAddress,
      state,
      bank,
      account_number: accountNumber,
      transaction_pin: transactionPin,
    } = await request.validate({
      schema: schema.create({
        otp: schema.string(stringRules),
        business_name: schema.string(stringRules),
        cac_registration_number: schema.string(stringRules),
        business_address: schema.string(stringRules),
        state: schema.string(stringRules),
        transaction_pin: schema.string([...stringRules, rules.minLength(4), rules.maxLength(4)]),
        // Bank detail fields are not nullable for this hackathon demo. In future, they can be nullable during signup and another endpoint for updating profile details provided
        bank: schema.string(stringRules),
        account_number: schema.string([...stringRules, rules.minLength(4), rules.maxLength(10)]),
      }),
      messages: {
        'otp.required': 'OTP is required.',
        'business_name.required': 'Business Name is required.',
        'cac_registration_number.required': 'CAC Registration Number is required.',
        'business_address.required': 'Business Address is required.',
        'state.required': 'State is required.',
        'transaction_pin.minLength': 'Transaction Pin must be 4 digits.',
        'transaction_pin.maxLength': 'Transaction Pin must be 4 digits.',
        'bank.required': 'Bank is required.',
        'account_number.required': 'Account Number is required.',
        'account_number.minLength': 'Account Number must be 10 digits.',
        'account_number.maxLength': 'Account Number must be 10 digits.',
      },
    })

    // Verify the OTP hash
    const isCorrect = await hash.verify(user.OTP.code, otp)

    if (!isCorrect) {
      return response.badRequest({ error: 'OTP is incorrect.' })
    }

    await db.transaction(async (trx) => {
      await user
        .merge({ role: UserRolesEnum.AgroDealer, transaction_pin: transactionPin })
        .useTransaction(trx)
        .save()

      await user.related('agroDealerProfile').create(
        {
          account_number: accountNumber,
          bank,
          business_address: businessAddress,
          business_name: businessName,
          cac_registration_number: cacRegNumber,
          state,
        },
        { client: trx }
      )
    })

    const token = await User.accessTokens.create(user)

    return response.created({
      message: 'You have successfully registered as an agro-dealer.',
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

  /**
   * Verify an agro-dealer profile.
   *
   * `PATCH /api/v1/users/:user_id/agro_dealer_profiles/:id/verify`
   */
  public async verify({ response, params }: HttpContext) {
    const agroDealerProfile = await AgroDealerProfile.query()
      .select(['id', 'is_verified', 'business_name'])
      .where({ user_id: params.user_id, id: params.id })
      .first()

    if (!agroDealerProfile) {
      return response.notFound({
        error: 'AgroDealer not found.',
      })
    }

    await agroDealerProfile.merge({ is_verified: true }).save()
    await agroDealerProfile.refresh()

    return response.ok({
      message: 'AgroDealer verified successfully.',
      data: {
        id: agroDealerProfile.id,
        business_name: agroDealerProfile.business_name,
        is_verified: agroDealerProfile.is_verified,
      },
    })
  }
}
