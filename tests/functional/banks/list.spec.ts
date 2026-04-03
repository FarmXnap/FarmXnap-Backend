import { test } from '@japa/runner'
import { BANK_DATA } from '#database/seeds/bank_data'

test.group('Banks / List', () => {
  // No database call

  test('should list banks')
    .run(async ({ client, route }) => {
      const response = await client.get(route('api.v1.banks.index'))

      response.assertStatus(200)

      response.assertBodyContains({
        data: BANK_DATA,
      })
    })
    .tags(['banks', 'list_banks'])
    .timeout(30000)
})
