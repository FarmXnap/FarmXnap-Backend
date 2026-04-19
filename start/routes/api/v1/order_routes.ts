import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import { UserRolesEnum } from '#models/user'

router
  .group(() => {
    // Order routes
    router
      .resource('products.orders', () => import('#controllers/orders_controller'))
      .apiOnly()
      .only(['store', 'index'])
      .middleware('store', [middleware.auth(), middleware.role({ role: UserRolesEnum.Farmer })])
  })
  .prefix('api/v1')
  .as('api.v1')
