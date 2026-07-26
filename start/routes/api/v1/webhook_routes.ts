import { PaymentProvidersEnum } from '#helpers/payment_helper'
import router from '@adonisjs/core/services/router'

const paymentProviderRegex = new RegExp(Object.values(PaymentProvidersEnum).join('|'))

// Webhook routes
router
  .group(() => {
    router
      .any('payments/:provider', [() => import('#controllers/webhooks_controller'), 'payments'])
      .where('provider', paymentProviderRegex)
      .as('payments')

    /**@todo: drop InterSwitch */
    router
      .post('interswitch', [() => import('#controllers/webhooks_controller'), 'interswitch'])
      .as('interswitch')
  })
  .prefix('api/v1/webhooks')
  .as('api.v1.webhooks')
