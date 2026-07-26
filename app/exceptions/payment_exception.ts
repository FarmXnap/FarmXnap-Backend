import { Exception } from '@adonisjs/core/exceptions'

export default class PaymentException extends Exception {
  static code = 'E_PAYMENT_PROVIDER_ERROR'

  static status = 502
}
