import { test } from '@japa/runner'
import { BANK_DATA } from '#database/seeds/bank_data'
import nock from 'nock'

test.group('Banks / List', (group) => {
  group.each.setup(async () => {
    // No database call

    return nock.cleanAll()
  })

  test('should list banks')
    .run(async ({ client, route }) => {
      // Set up nock
      nock('https://api.paystack.co').get('/bank?country=nigeria').reply(200, {
        status: true,
        message: 'Banks retrieved',
        data: BANK_DATA,
      })

      // Enabling this will disable the interception and make a real request
      // nock.recorder.rec()

      const response = await client.get(route('api.v1.banks.index'))

      response.assertStatus(200)

      response.assertBodyContains({
        data: BANK_DATA,
      })
    })
    .tags(['banks', 'list_banks'])
    .timeout(30000)
})
