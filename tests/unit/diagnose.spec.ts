import { test } from '@japa/runner'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs/promises'
import path from 'node:path'
import { productCategories } from '#models/product'
import nock from 'nock'
import AiService, {
  mockAiResponseDiseasedCrop,
  mockAiResponseHealthyCrop,
  mockAiResponseNonCrop,
} from '#services/ai_service'

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
    .with(['diseased_crop', 'not_crop', 'healthy_crop'] as const)
    .run(async ({ assert }, condition) => {
      // Mock the specific API call
      nock('https://generativelanguage.googleapis.com')
        .post(/.*generateContent.*/)
        .reply(200, {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify(
                      condition === 'not_crop'
                        ? mockAiResponseNonCrop
                        : condition === 'healthy_crop'
                          ? mockAiResponseHealthyCrop
                          : mockAiResponseDiseasedCrop
                    ),
                  },
                ],
              },
            },
          ],
        })

      // Enabling this will disable the interception and make a real request
      // nock.recorder.rec()

      const dirname = path.dirname(fileURLToPath(import.meta.url))
      let imagePath = ''

      switch (condition) {
        case 'diseased_crop':
          imagePath = '../maize_with_spots.jpeg'
          break
        case 'not_crop':
          imagePath = '../profile_pic.jpg'
          break
        case 'healthy_crop':
          imagePath = '../healthy-maize-leaf-preview.jpg'
          break

        default:
          throw new Error('Invalid condition')
      }

      const imageBuffer = await fs.readFile(path.join(dirname, imagePath))
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

      switch (condition) {
        case 'not_crop':
          assert.containSubset(result, {
            ...mockAiResponseNonCrop,
          })
          break

        case 'healthy_crop':
          assert.containSubset(result, {
            ...mockAiResponseHealthyCrop,
          })
          break

        case 'diseased_crop':
          assert.equal(result.crop, 'Maize')
          assert.isTrue((result.disease as string).toLowerCase().includes('spot'))

          assert.include(productCategories, result.category)
          break
        default:
          throw new Error('Invalid condition')
      }
    })
    .tags(['ai_service', 'diagnose'])
  // .timeout(30000)
})
