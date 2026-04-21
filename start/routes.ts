/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/
import router from '@adonisjs/core/services/router'

import '#start/routes/api/v1/user_routes'
import '#start/routes/api/v1/agro_dealer_profile_routes'
import '#start/routes/api/v1/farmer_profile_routes'
import '#start/routes/api/v1/authentication_routes'
import '#start/routes/api/v1/bank_routes'
import '#start/routes/api/v1/crop_scan_routes'
import '#start/routes/api/v1/product_routes'
import '#start/routes/api/v1/order_routes'
import '#start/routes/api/v1/payment_routes'
import '#start/routes/api/v1/webhook_routes'

router
  .get('health', async ({ response }) => {
    return response.status(200).send({
      status: 'OK',
      uptime: process.uptime(),
      timestamp: Date.now(),
    })
  })
  .as('health_check')
