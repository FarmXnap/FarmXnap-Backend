import type { HttpContext } from '@adonisjs/core/http'
import CropScan from '#models/crop_scan'
import { getTreatmentResults } from '../../helpers/crop_scan_helper.js'

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
      .orderBy('created_at', 'desc')

    return response.ok({ data: scans })
  }

  /**
   * Get treatment results for a crop scan.
   *
   * GET /api/v1/crop_scans/:crop_scan_id/treatments
   */
  public async indexTreatments({ params, response }: HttpContext) {
    const scan = await CropScan.findOrFail(params.crop_scan_id)

    if (!scan.search_term && !scan.active_ingredient) {
      return response.ok({ data: [] }) // Healthy crops don't need treatments
    }

    const result = await getTreatmentResults(scan)

    return response.ok({ data: result?.rows ?? [] })
  }
}
