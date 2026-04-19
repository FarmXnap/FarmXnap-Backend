import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

router
  .group(() => {
    // Login routes.
    router
      .post('auth/login_request', [() => import('#controllers/auth_controller'), 'loginRequest'])
      .as('login_request')

    router
      .post('auth/login_verify', [() => import('#controllers/auth_controller'), 'loginVerify'])
      .as('login_verify')

    // Logout route.
    router
      .post('auth/logout', [() => import('#controllers/auth_controller'), 'logout'])
      .as('logout')
      .use(middleware.auth())
  })
  .prefix('api/v1')
  .as('api.v1')
