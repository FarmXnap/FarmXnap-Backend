// app/controllers/webhooks_controller.ts
import Order, { OrderStatusEnum as OrderStatusesEnum } from '#models/order'
import env from '#start/env'
import { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import crypto from 'node:crypto'

export default class WebhooksController {
  /**
   * Endpoint for InterSwitch WebHooks.
   *
   * `POST /api/v1/webhooks/interswitch`
   */
  public async interswitch({ request, response }: HttpContext) {
    const signature = request.header('X-Interswitch-Signature')

    const secret = env.get('INTERSWITCH_SECRET_KEY')

    const rawBody = request.raw()

    if (!rawBody || !signature) {
      return response.status(401).send('')
    }

    logger.info(rawBody, '[WebHooks.InterSwitch] Raw Body')

    const computedHash = crypto.createHmac('sha512', secret).update(rawBody).digest('hex')

    if (computedHash !== signature.toLowerCase()) {
      logger.error('[WebHooks.InterSwitch] Webhook signature mismatch!')

      return response.status(401).send('')
    }

    const payload = request.body() as InterSwitchWebHookResponse

    if (payload.event === 'TRANSACTION.COMPLETED' && payload.data.responseCode === '00') {
      const txnRef = payload.data.merchantReference
      const order = await Order.query().where('payment_reference', txnRef).first()

      if (order && order.status !== OrderStatusesEnum.Paid) {
        if (Number(payload.data.amount) === Number(order.total_amount) * 100) {
          await order.merge({ status: OrderStatusesEnum.Paid }).save()

          logger.info(`[WebHooks.InterSwitch] Payment confirmed for ${txnRef}`)
        }
      }
    }

    return response.status(200).send('')
  }
}

type InterSwitchWebHookResponse = {
  event: string
  uuid: string
  timestamp: number
  data: {
    remittanceAmount: number
    bankCode: string
    amount: number
    paymentReference: string
    channel: string
    splitAccounts: []
    retrievalReferenceNumber: string
    transactionDate: number
    accountNumber: string | null
    responseCode: string
    token: string | null
    responseDescription: string
    paymentId: number
    merchantCustomerId: string
    escrow: boolean
    merchantReference: string
    currencyCode: string
    merchantCustomerName: string
    cardNumber: string
  }
}
