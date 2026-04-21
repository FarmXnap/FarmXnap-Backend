import type { HttpContext } from '@adonisjs/core/http'
import CropScan from '#models/crop_scan'
import { getCropTreatmentResults } from '../../helpers/crop_scan_helper.js'
import router from '@adonisjs/core/services/router'
import fs from 'node:fs/promises'
import AiService, { AIDiagnosis } from '#services/ai_service'
import { ProductCategory } from '#models/product'
import { schema } from '@adonisjs/validator'
export default class CropScansController {
  /**
   * Get crop scan history.
   *
   * GET /api/v1/crop_scans
   */
  public async index({ response, auth }: HttpContext) {
    const user = auth.user!
    await user.load('farmerProfile')

    const scans = await CropScan.query()
      .where('farmer_profile_id', user.farmerProfile!.id)
      .select(['id', 'farmer_profile_id', 'crop', 'disease', 'created_at'])
      .orderBy('created_at', 'desc')

    return response.ok({
      data: scans.map((scan) => ({
        ...scan.serialize(),
        links: {
          get_treatments: scan.disease
            ? { method: 'GET', href: router.makeUrl('api.v1.crop_scans.treatments', [scan.id]) }
            : undefined, // Healthy crops don't need treatments
        },
      })),
    })
  }

  /**
   * Get treatment results for a crop scan.
   *
   * GET /api/v1/crop_scans/:crop_scan_id/treatments
   */
  public async indexTreatments({ params, response }: HttpContext) {
    const scan = await CropScan.findOrFail(params.crop_scan_id)

    if (!scan.disease) {
      return response.ok({ data: [] }) // Healthy crops don't need treatments
    }

    const result = await getCropTreatmentResults(scan)

    return response.ok({
      data:
        result?.rows && result.rows.length
          ? result.rows.map((row) => ({
              ...row,
              links: {
                create_order: {
                  method: 'POST',
                  href: router.makeUrl('api.v1.products.orders.store', [row.id]),
                },
              },
            }))
          : [],
    })
  }

  /**
   * Scan a crop and get diagnosis and treatment results.
   *
   * `POST /api/v1/crop_scans`
   */
  public async store({ request, response, auth }: HttpContext) {
    const user = auth.user!

    const maxSize = '10mb'
    const supportedExtNames = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']

    const { image } = await request.validate({
      schema: schema.create({
        image: schema.file({
          size: maxSize,
          extnames: supportedExtNames,
        }),
      }),
      messages: {
        'image.required': 'Image is required.',
        'image.file.size': `Image size must not exceed ${maxSize}.`,
        'image.file.extname': `Image extension is not supported. Only ${supportedExtNames.join(', ')} are supported.`,
      },
    })

    if (!image.tmpPath) {
      return response.badRequest({ error: 'File upload failed' })
    }

    const imageBuffer = await fs.readFile(image.tmpPath)

    const mimeType = image.extname === 'jpg' ? 'image/jpeg' : `image/${image.extname}`

    let aiResult: AIDiagnosis | null = null

    try {
      aiResult = await AiService.diagnose(imageBuffer, mimeType)
    } catch {}

    if (!aiResult) {
      return response.ok({ data: [] })
    }

    if (aiResult.crop === 'INVALID') {
      return response.badRequest({ error: aiResult.instructions })
    }

    await user.load('farmerProfile')

    const isHealthy = aiResult.disease === 'HEALTHY'

    await CropScan.create({
      farmer_profile_id: user.farmerProfile!.id,
      crop: aiResult.crop,
      disease: isHealthy ? null : aiResult.disease,
      instructions: aiResult.instructions,
      search_term: isHealthy ? null : aiResult.search_term,
      active_ingredient: isHealthy ? null : aiResult.active_ingredient,
      category: isHealthy ? null : (aiResult.category as ProductCategory),
    })

    if (aiResult.disease === 'HEALTHY') {
      return response.ok({
        data: {
          diagnosis: {
            instructions: aiResult.instructions,
            crop: aiResult.crop,
          },
        },
      })
    }

    const result = await getCropTreatmentResults(aiResult)

    return response.ok({
      data: {
        diagnosis: {
          crop: aiResult.crop,
          disease: aiResult.disease,
          instructions: aiResult.instructions,
        },
        treatments:
          result?.rows && result.rows.length
            ? result.rows.map((row) => ({
                ...row,
                links: {
                  create_order: {
                    method: 'POST',
                    href: router.makeUrl('api.v1.products.orders.store', [row.id]),
                  },
                },
              }))
            : [],
      },
    })
  }
}
