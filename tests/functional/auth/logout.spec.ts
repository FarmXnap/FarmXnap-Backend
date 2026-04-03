import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import User, { UserRolesEnum } from '#models/user'

test.group('Auth / Logout', (group) => {
  group.each.setup(async () => {
    await db.beginGlobalTransaction()

    return () => db.rollbackGlobalTransaction()
  })

  test('should logout a user: {$self}')
    .with(['main_assertion', 'not_logged_in'] as const)
    .run(async ({ assert, client, route }, condition) => {
      const user = await User.create({ phone_number: '+2348012345678', role: UserRolesEnum.Farmer })

      let tokenValue = ''
      if (condition === 'main_assertion') {
        // Simulate login
        const token = await User.accessTokens.create(user)
        assert.lengthOf(await User.accessTokens.all(user), 1)

        tokenValue = token.value!.release()
      }

      const response = await client.post(route('api.v1.logout')).bearerToken(tokenValue)

      if (condition === 'not_logged_in') {
        response.assertStatus(401)

        return response.assertBodyContains({
          error: 'Unauthorized access',
        })
      }

      response.assertStatus(200)

      response.assertBodyContains({
        message: 'Logout successful.',
      })

      const tokens = await User.accessTokens.all(user)
      assert.lengthOf(tokens, 0)
    })
    .tags(['auth', 'logout'])
})
