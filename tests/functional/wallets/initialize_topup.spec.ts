import { test } from '@japa/runner'
import nock from 'nock'
import {
  convertAmountToMinorUnit,
  PaymentProvidersEnum,
  paystackBaseUrl,
} from '#helpers/payment_helper'
import db from '@adonisjs/lucid/services/db'
import { UserFactory } from '#database/factories/user_factory'
import { generateLoginToken } from '#helpers/test_helper'
import { WalletFactory } from '#database/factories/wallet_factory'
import Wallet, { WalletOwnerTypesEnum } from '#models/wallet'
import {
  TransactionCategoriesEnum,
  TransactionStatusesEnum,
  TransactionTypesEnum,
} from '#models/transaction'
import { randomBytes } from 'crypto'

test.group('Wallets / Topup / Initialize', (group) => {
  group.each.setup(async () => {
    await db.beginGlobalTransaction()

    return () => {
      nock.cleanAll()
      return db.rollbackGlobalTransaction()
    }
  })

  test('should initialize wallet topup: {$self}')
    .with([
      'main_assertion',
      'not_logged_in',
      'amount_not_provided',
      'amount_not_number',
      'no_profile',
      'no_wallet',
    ] as const)
    .run(async ({ client, route, assert }, condition) => {
      let reference = ''
      const providerAccessCode = randomBytes(15 / 2).toString('hex')
      const providerAuthorizationUrl = `https://checkout.paystack.com/${providerAccessCode}`

      // Set up nock
      nock(paystackBaseUrl)
        .post('/transaction/initialize')
        .reply(200, (_, requestBody: nock.Body) => {
          // Nock captures the body sent from our service layer. We get the reference from it.
          const parsedBody = typeof requestBody === 'string' ? JSON.parse(requestBody) : requestBody

          // console.log({parsedBody})

          reference = parsedBody.reference

          return {
            status: true,
            message: 'Authorization URL created',
            data: {
              authorization_url: providerAuthorizationUrl,
              access_code: providerAccessCode,
              reference,
            },
          }
        })

      // Enabling this will disable the interception and make a real request
      // nock.recorder.rec()

      const user = await UserFactory.with('farmerProfile').apply('isFarmer').create()

      let tokenValue = ''
      if (condition !== 'not_logged_in') {
        tokenValue = await generateLoginToken({ assert, user })
      }

      await user.load('farmerProfile')

      let wallet: Wallet | null = null

      if (condition !== 'no_wallet') {
        wallet = await WalletFactory.merge({
          owner_id: user.farmerProfile.id,
          owner_type: WalletOwnerTypesEnum.Farmer,
        }).create()
      }

      if (condition === 'no_profile') {
        await user.farmerProfile.delete()
      }

      const amountInMainUnit =
        condition === 'amount_not_provided'
          ? ''
          : condition === 'amount_not_number'
            ? 'five thousand'
            : 5000

      const response = await client
        .post(route('api.v1.wallets.topup.initialize'))
        .json({
          amount: amountInMainUnit,
        })
        .bearerToken(tokenValue)

      if (condition === 'not_logged_in') {
        response.assertStatus(401)

        return response.assertBodyContains({ error: 'Unauthorized access' })
      }

      if (condition === 'amount_not_provided') {
        response.assertStatus(422)

        return response.assertBodyContains({
          errors: ['Amount is required.'],
        })
      }

      if (condition === 'amount_not_number') {
        response.assertStatus(422)

        return response.assertBodyContains({
          errors: ['Amount must be a number.'],
        })
      }

      if (condition === 'no_profile') {
        response.assertStatus(400)

        return response.assertBodyContains({ error: 'No profile found for the user.' })
      }

      if (condition === 'no_wallet') {
        response.assertStatus(404)

        return response.assertBodyContains({ error: 'No wallet found for the user.' })
      }

      response.assertStatus(200)

      response.assertBodyContains({
        message: 'Wallet topup initialized successfully.',
        data: {
          access_code: providerAccessCode,
          authorization_url: providerAuthorizationUrl,
          reference,
        },
      })

      // Assert the transaction
      await wallet!.load('transactions')
      assert.lengthOf(wallet!.transactions, 1)

      const transaction = wallet!.transactions[0]

      assert.containSubset(transaction, {
        wallet_id: wallet!.id,
        type: TransactionTypesEnum.Credit,
        category: TransactionCategoriesEnum.Topup,
        status: TransactionStatusesEnum.Pending,
        amount: convertAmountToMinorUnit(Number(amountInMainUnit)).toString(),
        provider: PaymentProvidersEnum.Paystack,
        reference,
      })

      assert.exists(transaction.created_at)
      assert.exists(transaction.updated_at)
    })
    .tags(['wallets', 'topup', 'initialize_topup'])
  // .timeout(30000)
})
