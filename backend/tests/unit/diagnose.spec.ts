import { test } from '@japa/runner'
import AiService from '#services/ai_service'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs/promises'
import path from 'node:path'
import { productCategories } from '#models/product'
import nock from 'nock'
import { mockAiResponse } from '../../helpers/test_helper.js'

test.group('AI Service / Diagnose', (group) => {
  group.setup(() => {
    nock.disableNetConnect()
    nock.enableNetConnect('127.0.0.1') // Allow local DB/App connections
  })

  group.teardown(() => {
    nock.cleanAll()
    nock.enableNetConnect()
  })

  test('should diagnose a diseased crop from an image: {$self}')
    .run(async ({ assert }) => {
      // Mock the specific API call
      nock('https://generativelanguage.googleapis.com')
        .post(/.*generateContent.*/)
        .reply(200, {
          candidates: [{ content: { parts: [{ text: JSON.stringify(mockAiResponse) }] } }],
        })

      // Enabling this will disable the interception and make a real request
      // nock.recorder.rec()

      const dirname = path.dirname(fileURLToPath(import.meta.url))
      const imagePath = path.join(dirname, '../maize_with_spots.jpeg')

      const imageBuffer = await fs.readFile(imagePath)
      const mimeType = 'image/jpeg'

      const result = await AiService.diagnose(imageBuffer, mimeType)

      // console.log(result)

      assert.properties(result, [
        'crop',
        'disease',
        'category',
        'active_ingredient',
        'search_term',
        'instructions',
      ])

      assert.equal(result.crop, 'Maize')
      assert.isTrue((result.disease as string).toLowerCase().includes('spot'))

      assert.include(productCategories, result.category)
    })
    .tags(['ai_service', 'diagnose'])
    // .timeout(30000)
    .pin()
})
