import User from '#models/user'
import { HttpContext } from '@adonisjs/core/http'
import hash from '@adonisjs/core/services/hash'
import { schema } from '@adonisjs/validator'
import { generateOtp } from '../../helpers/utils.js'
import router from '@adonisjs/core/services/router'
import { rules } from '#services/validator_rules'

export default class AuthController {
  /**
   * Step 1: Request Login (Send OTP)
   * `POST /api/v1/auth/login_request`
   */
  public async loginRequest({ request, response }: HttpContext) {
    const { phone_number: phoneNumber } = await request.validate({
      schema: schema.create({
        phone_number: schema.string([rules.trim(), rules.stripTags(), rules.mobile()]),
      }),
      messages: {
        'phone_number.required': 'Phone Number is required.',
        'phone_number.mobile': 'Phone Number is not valid.',
      },
    })

    const user = await User.query().select(['id']).where('phone_number', phoneNumber).first()

    if (!user) {
      return response.notFound({ message: 'User not found' })
    }

    const otpCode = generateOtp()

    await user.related('OTP').updateOrCreate({ user_id: user.id }, { code: otpCode })

    return response.ok({
      message: 'OTP sent to your phone number.',
      data: {
        OTP: otpCode,
        links: {
          verify_login: {
            method: 'POST',
            href: router.makeUrl('api.v1.login_verify'),
          },
        },
      },
    })
  }

  /**
   * Step 2: Verify OTP & Issue Token
   * `POST /api/v1/auth/login_verify`
   */
  public async loginVerify({ request, response }: HttpContext) {
    const stringRules = [rules.trim(), rules.stripTags()]
    const { phone_number: phoneNumber, otp: otpCode } = await request.validate({
      schema: schema.create({
        phone_number: schema.string([...stringRules, rules.mobile()]),
        otp: schema.string(stringRules),
      }),
      messages: {
        'phone_number.required': 'Phone Number is required.',
        'phone_number.mobile': 'Phone Number is not valid.',
        'otp.required': 'OTP is required.',
      },
    })

    const user = await User.query()
      .select(['id', 'role', 'phone_number'])
      .where('phone_number', phoneNumber)
      .preload('OTP', (otpQuery) => {
        otpQuery.select(['code'])
      })
      .first()

    if (!user || !user.OTP || !(await hash.verify(user.OTP.code, otpCode))) {
      return response.unauthorized({ error: 'Invalid phone number or OTP.' })
    }

    const token = await User.accessTokens.create(user)

    return response.ok({
      message: 'Login successful.',
      data: {
        token: token.value?.release(),
        user: {
          id: user.id,
          phone_number: user.phone_number,
          role: user.role,
        },
      },
    })
  }

  /**
   * Logout a user (Farmer or Agro-dealer)
   * `POST /api/v1/auth/logout`
   */
  public async logout({ auth, response }: HttpContext) {
    const user = auth.user!

    // This deletes the current token being used for the request
    await User.accessTokens.delete(user, user.currentAccessToken.identifier)

    return response.ok({ message: 'Logout successful.' })
  }
}

/**
 * Login flow with email and password
 */

// export default class AuthController {
//   /**
//    * Login a user (Farmer or Agro-dealer)
//    * `POST /api/v1/login`
//    */
//   public async login({ request, response }: HttpContext) {
//     // const { email, password } = request.only(['email', 'password'])

//     const { email, password } = await request.validate({
//       schema: schema.create({
//         email: schema.string([rules.trim(), rules.stripTags(), rules.email()]),
//         password: schema.string(),
//       }),
//     })

//     try {
//       // 1. Verify credentials
//       // This automatically checks the email exists AND hashes the incoming password
//       // to see if it matches the one in the DB.
//       const user = await User.verifyCredentials(email, password)

//       // 2. If successful, create a new "Key" (Token)
//       const token = await User.accessTokens.create(user)

//       console.log({ token })

//       // 3. Send the token and the role back to the client
//       return response.ok({
//         message: 'Login successful',
//         token: token.value?.release(),
//         user: {
//           id: user.id,
//           email: user.email,
//           role: user.role, // The Client uses this to decide which dashboard to show
//         },
//       })
//     } catch (error) {
//       // If the email doesn't exist or the password is wrong
//       return response.unauthorized({ message: 'Invalid email or password' })
//     }
//   }
// }
