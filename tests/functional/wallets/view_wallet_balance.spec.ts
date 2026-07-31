import { test } from '@japa/runner'
import { convertAmountToMainUnit, naira_ISO_4217_Code } from '#helpers/payment_helper'
import db from '@adonisjs/lucid/services/db'
import { UserFactory } from '#database/factories/user_factory'
import { generateLoginToken } from '#helpers/test_helper'
import { WalletFactory } from '#database/factories/wallet_factory'
import Wallet, { WalletOwnerTypesEnum } from '#models/wallet'

test.group('Wallets / View Wallet Balance', (group) => {
  group.each.setup(async () => {
    await db.beginGlobalTransaction()

    return () => db.rollbackGlobalTransaction()
  })

  test('should show wallet balance to logged-in owner: {$self}')
    .with(['main_assertion', 'not_logged_in', 'no_profile', 'no_wallet'] as const)
    .run(async ({ client, route, assert }, condition) => {
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

      const response = await client
        .get(route('api.v1.wallets.view_wallet_balance'))
        .bearerToken(tokenValue)

      if (condition === 'not_logged_in') {
        response.assertStatus(401)

        return response.assertBodyContains({ error: 'Unauthorized access' })
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
        message: 'Wallet balance retrieved successfully.',
        data: {
          id: wallet!.id,
          currency: naira_ISO_4217_Code,
          balance: convertAmountToMainUnit(Number(wallet!.balance)),
          locked_balance: convertAmountToMainUnit(Number(wallet!.locked_balance)),
          available_balance: convertAmountToMainUnit(Number(wallet!.availableBalance)),
        },
      })
    })
    .tags(['wallets', 'view_wallet_balance'])
})
