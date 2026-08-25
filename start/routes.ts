/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/
import router from '@adonisjs/core/services/router'
import db from '@adonisjs/lucid/services/db'

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
import '#start/routes/api/v1/wallet_routes'

router
  .get('health', async ({ response }) => {
    const uptimeInSeconds = process.uptime()
    try {
      // Quick query to confirm DB is reachable
      await db.rawQuery('SELECT 1')
      return response.ok({
        status: 'ok',
        uptimeInSeconds,
        timestamp: new Date().toISOString(),
        database: 'connected',
      })
    } catch (error) {
      const err = error as Error
      return response.status(500).json({
        status: 'error',
        uptimeInSeconds,
        database: 'disconnected',
        message: err.message,
      })
    }
  })
  .as('health_check')
