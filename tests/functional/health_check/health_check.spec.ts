import { test } from '@japa/runner'

test.group('Health Check', () => {
  test('should ping the health check route')
    .run(async ({ assert, client, route }) => {
      const response = await client.get(route('health_check'))

      response.assertStatus(200)

      const body = response.body()

      assert.equal(body.status, 'ok')
      assert.equal(body.database, 'connected')
      assert.exists(body.uptimeInSeconds)
      assert.exists(body.timestamp)
    })
    .tags(['health_check'])
})
