import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

router
  .group(() => {
    // Resourceful routes for `users`.
    router
      .resource('users', () => import('#controllers/users_controller'))
      .apiOnly()
      .only(['store', 'index'])
      .middleware('index', middleware.admin_auth())
  })
  .prefix('api/v1')
  .as('api.v1')
