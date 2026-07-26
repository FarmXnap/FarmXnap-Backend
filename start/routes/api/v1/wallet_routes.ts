import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

// Wallet routes
router
  .group(() => {
    // Wallet topup routes
    router
      .group(() => {
        router
          .post('initialize', [() => import('#controllers/wallets_controller'), 'initializeTopup'])
          .as('initialize')
        router
          .get('verify', [() => import('#controllers/wallets_controller'), 'verifyTopup'])
          .as('verify')
      })
      .prefix('wallets/topup')
      .as('wallets.topup')
  })
  .prefix('api/v1')
  .as('api.v1')
  .middleware([middleware.auth()])
