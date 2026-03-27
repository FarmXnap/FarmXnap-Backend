/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js'
import { UserRolesEnum } from '#models/user'

router
  .group(() => {
    // Resourceful routes for `users`.
    router
      .resource('users', () => import('#controllers/users_controller'))
      .apiOnly()
      .only(['store', 'index'])
      .middleware('index', middleware.admin_auth())

    // Resourceful routes for `farmer_profiles`.
    router
      .resource('users.farmer_profiles', () => import('#controllers/farmer_profiles_controller'))
      .apiOnly()
      .only(['store', 'show'])
      .middleware('show', [middleware.auth(), middleware.role({ role: UserRolesEnum.Farmer })])

    // Route for farmer to scan a crop and get treatment results.
    router
      .post('farmer_profiles/:farmer_profile_id/diagnose', [
        () => import('#controllers/farmer_profiles_controller'),
        'diagnose',
      ])
      .as('farmer_profiles.diagnose')
      .use([middleware.auth(), middleware.role({ role: UserRolesEnum.Farmer })])

    // Route for farmer to get crop scan history
    router
      .get('farmer_profiles/:farmer_profile_id/crop_scans', [
        () => import('#controllers/farmer_profiles_controller'),
        'cropScans',
      ])
      .as('farmer_profiles.crop_scans')
      .use([middleware.auth(), middleware.role({ role: UserRolesEnum.Farmer })])

    // Route for farmer to get treatment for a crop scan
    router
      .get('farmer_profiles/:farmer_profile_id/crop_scans/:id/treatments', [
        () => import('#controllers/farmer_profiles_controller'),
        'getTreatments',
      ])
      .as('farmer_profiles.crop_scans.treatments')
      .use([middleware.auth(), middleware.role({ role: UserRolesEnum.Farmer })])

    // Resourceful routes for `agro_dealer_profiles`.
    router
      .resource(
        'users.agro_dealer_profiles',
        () => import('#controllers/agro_dealer_profiles_controller')
      )
      .apiOnly()
      .only(['store', 'show'])
      .middleware('show', [middleware.auth(), middleware.role({ role: UserRolesEnum.AgroDealer })])

    // Route for admin to verify an agro-dealer
    router
      .patch('users/:user_id/agro_dealer_profiles/:id/verify', [
        () => import('#controllers/agro_dealer_profiles_controller'),
        'verify',
      ])
      .as('users.agro_dealer_profiles.verify')
      .use(middleware.admin_auth())

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

    // Route for admin to list banks
    router.get('banks', [() => import('#controllers/banks_controller'), 'index']).as('banks.index')
  })
  .prefix('api/v1')
  .as('api.v1')
