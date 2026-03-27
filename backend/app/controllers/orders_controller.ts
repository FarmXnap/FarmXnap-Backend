import type { HttpContext } from '@adonisjs/core/http'
import Product from '#models/product'
import crypto from 'node:crypto'
import Order, { OrderStatusEnum } from '#models/order'
import env from '#start/env'
import { callbackUrl, nairaISOCode } from '../../helpers/utils.js'
import logger from '@adonisjs/core/services/logger'

export default class OrdersController {
  /**
   * Create a product order by a farmer.
   *
   * `POST /api/v1/products/:product_id/orders`
   */
  public async store({ response, auth, params }: HttpContext) {
    const user = auth.user!
    await user.load('farmerProfile') // Middleware ensures the user is a farmer

    const product = await Product.query()
      .select(['id', 'price', 'agro_dealer_profile_id'])
      .where('id', params.product_id)
      .first()

    if (!product) {
      return response.notFound({ error: 'Product not found.' })
    }

    // Calculate Escrow split i.e 4% commission
    const price = Number(product.price)
    const commission = price * 0.04
    const payout = price - commission
    const txnRef = `FXP-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${Date.now()}`

    const order = await Order.create({
      agro_dealer_profile_id: product.agro_dealer_profile_id,
      farmer_profile_id: user.farmerProfile!.id,
      product_id: product.id,
      commission_amount: commission.toFixed(2),
      total_amount: product.price,
      payout_amount: payout.toFixed(2),
      payment_reference: txnRef,
      status: OrderStatusEnum.Pending,
    })

    logger.info({ order: order.serialize() }, '[OrdersController.store] Order initialized.')

    return response.created({
      message: 'Order initialized.',
      data: {
        id: order.id,
        paymentData: {
          merchantCode: env.get('INTERSWITCH_MERCHANT_CODE'),
          payItemId: env.get('INTERSWITCH_PAY_ITEM_ID'),
          txnRef: txnRef,
          amount: price * 100, // Interswitch expects Kobo
          currency: nairaISOCode, // Naira ISO Code
          callbackUrl: callbackUrl,
        },
      },
    })
  }
}
