import router from '@adonisjs/core/services/router'

router
  .group(() => {
    // Route for admin to list banks
    router.get('banks', [() => import('#controllers/banks_controller'), 'index']).as('banks.index')
    
    // Route for admin to verify bank account
    router
      .post('banks/verify', [() => import('#controllers/banks_controller'), 'verify'])
      .as('banks.verify')
  })
  .prefix('api/v1')
  .as('api.v1')
