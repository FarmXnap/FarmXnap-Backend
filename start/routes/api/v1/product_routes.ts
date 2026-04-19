import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import { UserRolesEnum } from '#models/user'

router
  .group(() => {
    // Product routes
    router
      .resource('products', () => import('#controllers/products_controller'))
      .apiOnly()
      .only(['store', 'index', 'show', 'update'])
      .middleware('index', [middleware.auth(), middleware.role({ role: UserRolesEnum.AgroDealer })])
      .middleware('store', [middleware.auth(), middleware.role({ role: UserRolesEnum.AgroDealer })])
      .middleware('show', [middleware.auth(), middleware.role({ role: UserRolesEnum.AgroDealer })])
      .middleware('update', [
        middleware.auth(),
        middleware.role({ role: UserRolesEnum.AgroDealer }),
      ])
  })
  .prefix('api/v1')
  .as('api.v1')
