import BasePaymentService from '#services/payments/base_payment_service'
import env from '#start/env'
import type { ApplicationService } from '@adonisjs/core/types'
import { BaseModel, SnakeCaseNamingStrategy } from '@adonisjs/lucid/orm'

export default class AppProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Register bindings to the container
   */
  register() {
    this.app.container.bind(BasePaymentService, async () => {
      const paystackProvider = (await import('#services/payments/paystack_provider')).default

      return env.get('PAYMENT_PROVIDER').toLowerCase() === 'paystack'
        ? new paystackProvider()
        : /**
           * @todo: Replace this with Flutterwave when implemented.
           */
          new paystackProvider()
    })
  }

  /**
   * The container bindings have booted
   */
  async boot() {
    // Forces Lucid to map database snake_case columns to model properties and ensures `.serialize()` outputs snake_case keys.
    // Note: Foreign keys must still be explicitly defined in snake_case on the model.
    BaseModel.namingStrategy = new SnakeCaseNamingStrategy()
  }

  /**
   * The application has been booted
   */
  async start() {}

  /**
   * The process has been started
   */
  async ready() {}

  /**
   * Preparing to shutdown the app
   */
  async shutdown() {}
}
