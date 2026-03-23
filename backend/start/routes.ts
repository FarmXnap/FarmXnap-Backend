/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'

router
  .group(() => {
    // Resourceful routes for `users`.
    router
      .resource('users', () => import('#controllers/users_controller'))
      .apiOnly()
      .only(['store'])

    // Resourceful routes for `farmer_profiles`.
    router
      .resource('users.farmer_profiles', () => import('#controllers/farmer_profiles_controller'))
      .apiOnly()
      .only(['store'])

    // Resourceful routes for `agro_dealer_profiles`.
    router
      .resource(
        'users.agro_dealer_profiles',
        () => import('#controllers/agro_dealer_profiles_controller')
      )
      .apiOnly()
      .only(['store'])
  })
  .prefix('api/v1')
  .as('api.v1')
