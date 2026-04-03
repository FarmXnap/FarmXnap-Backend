import { HttpContext } from '@adonisjs/core/http'
import Order, { OrderStatusEnum } from '#models/order'
import { rules, schema } from '@adonisjs/validator'
import env from '#start/env'
import logger from '@adonisjs/core/services/logger'
import { interswitchInquiryBaseUrl } from '../../helpers/utils.js'

export default class PaymentsController {
  /**
   * Endpoint for Redirects from InterSwitch Payment Screen.
   *
   * `POST /api/v1/payments/callback`
   */
  public async callback({ request, response }: HttpContext) {
    logger.info(request.body(), '[Payments.Callback] Request body')

    const { txnRef } = await request.validate({
      schema: schema.create({
        txnRef: schema.string([rules.trim(), rules.escape()]),
      }),
      data: request.qs(),
    })

    const order = await Order.query()
      .select(['id', 'total_amount', 'status'])
      .where('payment_reference', txnRef)
      .firstOrFail()

    const amountInKobo = Number(order.total_amount) * 100

    const merchantCode = env.get('INTERSWITCH_MERCHANT_CODE')

    const inquiryUrl = `${interswitchInquiryBaseUrl}/collections/api/v1/gettransaction.json?merchantcode=${merchantCode}&transactionreference=${txnRef}&amount=${amountInKobo}`

    const res = await fetch(inquiryUrl, {
      method: 'GET',
      headers: {
        // 'Authorization': ``,
        'Content-Type': 'application/json',
      },
    })

    const data = (await res.json()) as InterSwitchPaymentCallbackResponse

    logger.info(data, '[Payments.Callback] Response data')

    // '00' means Success in Interswitch-speak
    if (data.ResponseCode === '00' && Number(data.Amount) === Number(order.total_amount) * 100) {
      if (order.status === OrderStatusEnum.Paid) {
        return response.ok({ message: 'Payment into escrow already confirmed.' })
      }

      await order.merge({ status: OrderStatusEnum.Paid }).save()

      await order.refresh()

      return response.ok({ message: 'Payment into Escrow Verified,', data: order })
    }

    return response.accepted({
      message: 'Payment verification in progress',
      status: order.status, // Likely still 'Pending'
    })
  }
}

type InterSwitchPaymentCallbackResponse = {
  Amount: 10000
  CardNumber: string
  MerchantReference: string
  PaymentReference: string
  RetrievalReferenceNumber: string
  SplitAccounts: []
  TransactionDate: Date
  ResponseCode: string
  ResponseDescription: string
  AccountNumber: string
}
