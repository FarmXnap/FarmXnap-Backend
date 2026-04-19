import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import { UserRolesEnum } from '#models/user'

router
  .group(() => {
    // Resourceful routes for `farmer_profiles`.
    router
      .resource('users.farmer_profiles', () => import('#controllers/farmer_profiles_controller'))
      .apiOnly()
      .only(['store', 'show'])
      .middleware('show', [middleware.auth(), middleware.role({ role: UserRolesEnum.Farmer })])

    // Route for farmer to scan a crop and get treatment results.
    router
      .post('farmer_profiles/:farmer_profile_id/diagnose', [
        () => import('#controllers/farmer_profiles_controller'),
        'diagnose',
      ])
      .as('farmer_profiles.diagnose')
      .use([middleware.auth(), middleware.role({ role: UserRolesEnum.Farmer })])
  })
  .prefix('api/v1')
  .as('api.v1')
