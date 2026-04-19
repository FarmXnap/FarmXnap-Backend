import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import { UserRolesEnum } from '#models/user'

router
  .group(() => {
    // Resourceful routes for crop scans
    router
      .resource('crop_scans', () => import('#controllers/crop_scans_controller'))
      .apiOnly()
      .only(['index'])
      .middleware('index', [middleware.auth(), middleware.role({ role: UserRolesEnum.Farmer })])

    // Route to get treatment results for a crop scan
    router
      .get('crop_scans/:crop_scan_id/treatments', [
        () => import('#controllers/crop_scans_controller'),
        'indexTreatments',
      ])
      .as('crop_scans.treatments')
      .use([middleware.auth(), middleware.role({ role: UserRolesEnum.Farmer })])
  })
  .prefix('api/v1')
  .as('api.v1')
