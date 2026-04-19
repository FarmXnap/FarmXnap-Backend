import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import { UserRolesEnum } from '#models/user'

router
  .group(() => {
    // Resourceful routes for `agro_dealer_profiles`.
    router
      .resource(
        'users.agro_dealer_profiles',
        () => import('#controllers/agro_dealer_profiles_controller')
      )
      .apiOnly()
      .only(['store', 'show'])
      .middleware('show', [middleware.auth(), middleware.role({ role: UserRolesEnum.AgroDealer })])

    // Route for admin to verify an agro-dealer
    router
      .patch('users/:user_id/agro_dealer_profiles/:id/verify', [
        () => import('#controllers/agro_dealer_profiles_controller'),
        'verify',
      ])
      .as('users.agro_dealer_profiles.verify')
      .use(middleware.admin_auth())
  })
  .prefix('api/v1')
  .as('api.v1')
