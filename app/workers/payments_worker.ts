import BasePaymentService from '#services/payments/base_payment_service'
import env from '#start/env'
import { AppWorker, QueueName, WorkerBootResult } from '#types/queue'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import { Queue, Worker, Job } from 'bullmq'

export default class PaymentsWorker implements AppWorker {
  #worker?: Worker
  #queue?: Queue
  #queueName: QueueName = 'payments'

  public static readonly processPaymentWebhookJobName = 'process-payment-webhook'

  public static readonly expireStaleTransactionsJobName = 'expire-stale-transactions'

  /**
   * Register bindings to the container
   */
  register() {}

  /**
   * The container bindings have booted
   */
  async boot(): Promise<WorkerBootResult> {
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
          // Resolve the payment service once for all jobs
          const paymentService = await app.container.make(BasePaymentService)

          if (job.name === PaymentsWorker.processPaymentWebhookJobName) {
            const { payload } = job.data

            logger.info(
              { jobId: job.id, jobName: job.name },
              '[Queue Provider] Payment Webhook job picked up by worker.'
            )

            await paymentService.processWebhookPayload(payload)
          } else if (job.name === PaymentsWorker.expireStaleTransactionsJobName) {
            logger.info(
              { jobId: job.id, jobName: job.name },
              '[Queue Provider] Expire stale transactions job picked up by worker.'
            )

            await paymentService.expireStaleTransactions()
          }
        } catch (error) {
          logger.error(
            { err: error, jobId: job.id, jobName: job.name },
            `[Queue Provider] ${job.name} failed.`
          )
          throw error // Re-throw error for retry attempt.
        }
      },
      { connection }
    )

    this.#worker.on('error', (error) => {
      logger.error({ err: error }, '[Queue Provider] Payments worker error.')
    })

    // Note: The job "processPaymentWebhookJobName" is added to the queue in the controller.

    await this.#queue.add(
      PaymentsWorker.expireStaleTransactionsJobName,
      {},
      {
        repeat: {
          pattern: '0 * * * *', // Runs at top of every hour
        },
        jobId: PaymentsWorker.expireStaleTransactionsJobName,
      }
    )

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
