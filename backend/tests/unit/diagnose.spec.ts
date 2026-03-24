import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import AiService from '#services/ai_service'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs/promises'
import path from 'node:path'
import { productCategories } from '#models/product'

test.group('AI Service / Diagnose', (group) => {
  group.each.setup(async () => {
    await db.beginGlobalTransaction()

    return () => db.rollbackGlobalTransaction()
  })

  test('should diagnose a diseased crop from an image: {$self}')
    .run(async ({ assert }) => {
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
    .timeout(30000)
    // .pin()
})
