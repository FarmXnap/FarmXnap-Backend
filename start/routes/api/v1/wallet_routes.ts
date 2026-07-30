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
      .as('topup')

    // View wallet balance route
    router
      .get('wallets/me', [() => import('#controllers/wallets_controller'), 'viewWalletBalance'])
      .as('view_wallet_balance')
  })
  .prefix('api/v1')
  .as('api.v1.wallets')
  .middleware([middleware.auth()])
