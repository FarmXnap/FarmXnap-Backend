import User, { UserRolesEnum } from '#models/user'
import type { HttpContext } from '@adonisjs/core/http'
import { schema } from '@adonisjs/validator'
import hash from '@adonisjs/core/services/hash'
import db from '@adonisjs/lucid/services/db'
import fs from 'node:fs/promises'
import AiService, { AIDiagnosis } from '#services/ai_service'
import { ModelObject } from '@adonisjs/lucid/types/model'
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
      },
    })
  }

  /**
   * Scan a crop and get diagnosis and treatment.
   *
   * `POST /api/v1/farmer_profiles/:farmer_profile_id/diagnose`
   */
  public async diagnose({ request, response }: HttpContext) {
    const maxSize = '10mb'
    const supportedExtNames = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']

    const { image } = await request.validate({
      schema: schema.create({
        image: schema.file({
          size: maxSize,
          extnames: supportedExtNames,
        }),
      }),
      messages: {
        'image.required': 'Image is required.',
        'image.file.size': `Image size must not exceed ${maxSize}.`,
        'image.file.extname': `Image extension is not supported. Only ${supportedExtNames.join(', ')} are supported.`,
      },
    })

    if (!image.tmpPath) {
      return response.badRequest({ error: 'File upload failed' })
    }

    const imageBuffer = await fs.readFile(image.tmpPath)

    const mimeType = image.extname === 'jpg' ? 'image/jpeg' : `image/${image.extname}`

    let aiResult: AIDiagnosis | null = null

    try {
      aiResult = await AiService.diagnose(imageBuffer, mimeType)
    } catch {}

    if (!aiResult) {
      return response.ok({ data: [] })
    }

    if (aiResult.crop === 'INVALID') {
      return response.badRequest({ error: aiResult.instructions })
    }

    if (aiResult.disease === 'HEALTHY') {
      return response.ok({
        data: {
          diagnosis: {
            instructions: aiResult.instructions,
            crop: aiResult.crop,
          },
        },
      })
    }

    const vectorSearch = `to_tsvector('english', p.name || ' ' || COALESCE(p.description, '') || ' ' || p.target_problems)`
    const querySearch = `websearch_to_tsquery('english', :searchTerm)`
    // plainto_tsquery
    // prefer websearch_to_tsquery to plainto_tsquery

    /**
     * @todo Improve rank to factor in location proximity
     */
    const result = await db.rawQuery(
      `
      SELECT
        p.id,
        p.name,
        p.active_ingredient,
        p.price,
        p.stock_quantity,
        p.unit,
        p.description,
        p.target_problems,
        p.category,
        adp.business_name,
        adp.business_address,
        adp.state,
        adp.bank,
        adp.account_number,
        u.phone_number,
        -- Ranking: full text search is weighted higher than fuzzy similarity
        (
          ts_rank(
            ${vectorSearch},
            ${querySearch}
          ) * 2
          + similarity(p.name, :searchTerm)
          -- Also boost active ingredient similarity
          + similarity(p.active_ingredient, :activeIngredient) * 3
        ) AS rank
      FROM products p
        JOIN agro_dealer_profiles adp ON p.agro_dealer_profile_id = adp.id
        JOIN users u on adp.user_id = u.id
      WHERE adp.is_verified = true
        AND p.category ILIKE :category
        AND (
          ${vectorSearch} @@ ${querySearch}
          OR p.name % :searchTerm
          OR p.target_problems % :searchTerm
          OR p.active_ingredient % :activeIngredient 
          OR p.active_ingredient ILIKE :activeIngredientWildcard
        )
      ORDER BY rank desc
      `,
      {
        category: aiResult.category,
        searchTerm: aiResult.search_term,
        activeIngredient: aiResult.active_ingredient,
        activeIngredientWildcard: `%${aiResult.active_ingredient}%`,
      }
    )

    return response.ok({
      data: {
        diagnosis: {
          crop: aiResult.crop,
          disease: aiResult.disease,
          instructions: aiResult.instructions,
        },
        treatments:
          result?.rows && result.rows.length
            ? result.rows.map((row: ModelObject /** todo: provide type */) => ({
                ...row,
                links: {
                  create_order: {
                    method: 'POST',
                    href: router.makeUrl('api.v1.products.orders.store', [row.id]),
                  },
                },
              }))
            : [],
      },
    })
  }
}
