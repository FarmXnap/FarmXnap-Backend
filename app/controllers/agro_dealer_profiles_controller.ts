import User, { UserRolesEnum } from '#models/user'
import type { HttpContext } from '@adonisjs/core/http'
import { schema } from '@adonisjs/validator'
import hash from '@adonisjs/core/services/hash'
import db from '@adonisjs/lucid/services/db'
import AgroDealerProfile from '#models/agro_dealer_profile'
import { rules } from '#services/validator_rules'
import router from '@adonisjs/core/services/router'
import BankService from '#services/bank_service'

export default class AgroDealerProfilesController {
  /**
   * Create an agro-dealer profile.
   *
   * `POST /api/v1/users/:user_id/agro_dealer_profiles`
   */
  public async store({ request, response, params, logger }: HttpContext) {
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
      business_name: businessName,
      cac_registration_number: cacRegNumber,
      business_address: businessAddress,
      lga,
      state,
      bank_code: bankCode,
      bank_account_number: bankAccountNumber,
      transaction_pin: transactionPin,
    } = await request.validate({
      schema: schema.create({
        otp: schema.string(stringRules),
        business_name: schema.string(stringRules),
        cac_registration_number: schema.string(stringRules),
        business_address: schema.string(stringRules),
        state: schema.string(stringRules),
        lga: schema.string(stringRules),
        transaction_pin: schema.string([...stringRules, rules.minLength(4), rules.maxLength(4)]),
        bank_code: schema.string(stringRules),
        bank_account_number: schema.string([
          ...stringRules,
          rules.minLength(10),
          rules.maxLength(10),
        ]),
      }),
      messages: {
        'otp.required': 'OTP is required.',
        'business_name.required': 'Business Name is required.',
        'cac_registration_number.required': 'CAC Registration Number is required.',
        'business_address.required': 'Business Address is required.',
        'state.required': 'State is required.',
        'lga.required': 'LGA is required.',
        'transaction_pin.minLength': 'Transaction Pin must be 4 digits.',
        'transaction_pin.maxLength': 'Transaction Pin must be 4 digits.',
        'bank_code.required': 'Bank Code is required.',
        'bank_account_number.required': 'Bank Account Number is required.',
        'bank_account_number.minLength': 'Bank Account Number must be 10 digits.',
        'bank_account_number.maxLength': 'Bank Account Number must be 10 digits.',
      },
    })

    // Verify the OTP hash
    const isCorrect = await hash.verify(user.OTP.code, otp)

    if (!isCorrect) {
      return response.badRequest({ error: 'OTP is incorrect.' })
    }

    // Verify bank account number
    const verification = await BankService.verifyBankAccount(bankCode, bankAccountNumber)

    if (typeof verification === 'string') {
      return response.badGateway({ error: verification })
    }

    if (typeof verification === 'object' && 'errorCode' in verification) {
      if (verification.errorCode === 422) {
        return response.unprocessableEntity({ errors: [verification.message] })
      }
      return response.internalServerError({ error: verification.message })
    }

    const banks = await BankService.getBanks()
    const bankName = banks.find((b) => b.code === bankCode)?.name

    if (!bankName) {
      // At this stage, it is unlikely that the bankName is not resolved
      const errorMessage = '[AgroDealerProfilesController.store] Unable to resolve bank name.'
      logger.error(
        {
          bankCode,
          bankAccountNumber,
          userId: user.id,
          businessName,
        },
        errorMessage
      )

      throw new Error(errorMessage)
    }

    await db.transaction(async (trx) => {
      await user
        .merge({ role: UserRolesEnum.AgroDealer, transaction_pin: transactionPin })
        .useTransaction(trx)
        .save()

      await user.related('agroDealerProfile').create(
        {
          bank_code: bankCode,
          bank_name: bankName,
          bank_account_number: verification.account_number,
          bank_account_name: verification.account_name,
          business_address: businessAddress,
          business_name: businessName,
          cac_registration_number: cacRegNumber,
          state,
          lga,
        },
        { client: trx }
      )
    })

    const token = await User.accessTokens.create(user)

    await user.load('agroDealerProfile')

    return response.created({
      message: 'You have successfully registered as an agro-dealer.',
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
            href: router.makeUrl('api.v1.users.agro_dealer_profiles.show', [
              user.id,
              user.agroDealerProfile.id,
            ]),
          },
        },
      },
    })
  }

  /**
   * Show an agro-dealer profile.
   *
   * `GET /api/v1/users/:user_id/agro_dealer_profiles/:id`
   */
  public async show({ response, params, auth }: HttpContext) {
    const user = auth.user!

    await user.load('agroDealerProfile', (agroDealerProfileQuery) => {
      agroDealerProfileQuery.select([
        'id',
        'user_id',
        'cac_registration_number',
        'business_name',
        'business_address',
        'state',
        'lga',
        'bank_name',
        'bank_account_number',
        'bank_account_name',
        'is_verified',
        'created_at',
        'updated_at',
      ])
    })

    // Match params agains authenticated data. To throw off anyone playing with ids in the url.
    if (params.user_id !== user.id || params.id !== user.agroDealerProfile?.id) {
      return response.forbidden({
        error: 'You are not authorized to view this profile.',
      })
    }

    return response.ok({
      data: {
        id: user.id,
        phone_number: user.phone_number,
        role: user.role,
        agroDealerProfile: user.agroDealerProfile,
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
