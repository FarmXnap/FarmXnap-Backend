import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import { UserRolesEnum } from '#models/user'

router
  .group(() => {
    // Resourceful routes for crop scans
    router
      .resource('crop_scans', () => import('#controllers/crop_scans_controller'))
      .apiOnly()
      .only(['index', 'store'])

    // Route to get treatment results for a crop scan
    router
      .get('crop_scans/:crop_scan_id/treatments', [
        () => import('#controllers/crop_scans_controller'),
        'indexTreatments',
      ])
      .as('crop_scans.treatments')
  })
  .prefix('api/v1')
  .as('api.v1')
  .use([middleware.auth(), middleware.role({ role: UserRolesEnum.Farmer })])
