import type { HttpContext } from '@adonisjs/core/http'
import CropScan from '#models/crop_scan'
import { getCropTreatmentResults } from '../../helpers/crop_scan_helper.js'
import router from '@adonisjs/core/services/router'

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
}
