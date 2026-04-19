import router from '@adonisjs/core/services/router'

router
  .group(() => {
   // Webhook
    router
      .post('webhooks/interswitch', [
        () => import('#controllers/webhooks_controller'),
        'interswitch',
      ])
      .as('webhooks.interswitch')
  })
  .prefix('api/v1')
  .as('api.v1')
