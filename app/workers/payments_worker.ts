import BasePaymentService from '#services/payments/base_payment_service'
import env from '#start/env'
import { QueueName } from '#types/queue'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import { Queue, Worker, Job } from 'bullmq'

export default class PaymentsWorker {
  #worker?: Worker
  #queue?: Queue
  #queueName: QueueName = 'payments'

  public static readonly processPaymentWebhookJobName = 'process-payment-webhook'

  /**
   * Register bindings to the container
   */
  register() {}

  /**
   * The container bindings have booted
   */
  async boot() {
    const connection = { host: env.get('REDIS_HOST'), port: env.get('REDIS_PORT') }

    // Create the queue
    const paymentsQueueName = 'payments'
    this.#queue = new Queue(paymentsQueueName, {
      connection,
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          // Wait 5s, 10s, 20s, 40s...
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 },
      },
    })

    // Create the worker
    this.#worker = new Worker(
      paymentsQueueName,
      async (job: Job) => {
        try {
          if (job.name === PaymentsWorker.processPaymentWebhookJobName) {
            const { payload } = job.data

            logger.info(
              { jobId: job.id, jobName: job.name },
              '[Queue Provider] Payment Webhook job picked up by worker.'
            )

            // Call the database backup service
            const paymentService = await app.container.make(BasePaymentService)
            await paymentService.processWebhookPayload(payload)
          }
        } catch (error) {
          logger.error(
            { err: error, jobId: job.id, jobName: job.name },
            `[Queue Provider] Payment webhook job failed.`
          )
          throw error // Re-throw error for retry attempt.
        }
      },
      { connection }
    )

    this.#worker.on('error', (error) => {
      logger.error({ err: error }, '[Queue Provider] Payments worker error.')
    })
    // Note: Add the job to the queue in the controller.

    //
    return { queueName: this.#queueName, queue: this.#queue, worker: this.#worker }
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
