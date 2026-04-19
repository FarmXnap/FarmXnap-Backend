import router from '@adonisjs/core/services/router'

router
  .group(() => {
    // Callback to redirect to after payment
    router
      .post('payments/callback', [() => import('#controllers/payments_controller'), 'callback'])
      .as('payments.callback')
  })
  .prefix('api/v1')
  .as('api.v1')
