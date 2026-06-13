import DatabaseBackupService from '#services/database_backup_service'
import BasePaymentService from '#services/payments/base_payment_service'
import env from '#start/env'
import logger from '@adonisjs/core/services/logger'
import type { ApplicationService } from '@adonisjs/core/types'
import { Queue, Worker, Job } from 'bullmq'

/**
 * @todo: CLean up this file by moving the different workers for backups, payments etc. to separate files and importing here.
 */

export default class QueueProvider {
  constructor(protected app: ApplicationService) {}

  #backupsWorker?: Worker
  #backupsQueue?: Queue

  #paymentsWorker?: Worker
  #paymentsQueue?: Queue

  public readonly processPaymentWebhookJobName = 'process-payment-webhook'

  /**
   * Register bindings to the container
   */
  register() {}

  /**
   * The container bindings have booted
   */
  async boot() {
    const connection = { host: env.get('REDIS_HOST'), port: env.get('REDIS_PORT') }

    // -----------------------------
    // PAYMENTS QUEUE
    // -----------------------------
    // Create the queue
    const paymentsQueueName = 'payments'
    this.#paymentsQueue = new Queue(paymentsQueueName, {
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
    this.#paymentsWorker = new Worker(
      paymentsQueueName,
      async (job: Job) => {
        try {
          if (job.name === this.processPaymentWebhookJobName) {
            const { payload } = job.data

            logger.info(
              { jobId: job.id, jobName: job.name },
              '[Queue Provider] Payment Webhook job picked up by worker.'
            )

            // Call the database backup service
            const paymentService = await this.app.container.make(BasePaymentService)
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

    this.#paymentsWorker.on('error', (error) => {
      logger.error({ err: error }, '[Queue Provider] Payments worker error.')
    })
    // Add the job to the queue in the controller.

    // -----------------------------
    // BACKUPS QUEUE
    // -----------------------------
    // Create the queue
    const backupsQueueName = 'backups'
    this.#backupsQueue = new Queue(backupsQueueName, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          // Wait 2s, 4s, 8s...
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: { count: 10 },
        removeOnFail: { count: 50 },
      },
    })

    // Run only in production and staging.
    if (!this.app.inProduction) {
      return
    }

    const dbBackupsJobName = 'daily-db-backups'

    // Create the worker
    this.#backupsWorker = new Worker(
      backupsQueueName,
      async (job: Job) => {
        try {
          if (job.name === dbBackupsJobName) {
            logger.info(
              { jobId: job.id, jobName: job.name },
              '[Queue Provider] Database Backup job picked up by worker.'
            )

            // Call the database backup service
            const dbBackupService = await this.app.container.make(DatabaseBackupService)
            await dbBackupService.run()
          }
        } catch (error) {
          logger.error(
            { err: error, jobId: job.id, jobName: job.name },
            `[Queue Provider] Backup job failed.`
          )
          throw error // Re-throw error for retry attempt.
        }
      },
      { connection }
    )

    this.#backupsWorker.on('error', (error) => {
      logger.error({ err: error }, '[Queue Provider] Backups worker error.')
    })

    // Add a job to the queue
    await this.#backupsQueue.add(
      dbBackupsJobName,
      {},
      {
        repeat: { pattern: '0 0 * * *' /** Every day at midnight (server time) */ },
        jobId: dbBackupsJobName,
      }
    )
  }

  /**
   * The application has been booted
   */
  async start() {}

  /**
   * The process has been started
   */
  async ready() {}

  public getPaymentsQueue(): Queue {
    if (!this.#paymentsQueue) {
      throw new Error('Payments queue has not been initialized.')
    }

    return this.#paymentsQueue
  }

  /**
   * Preparing to shutdown the app
   */
  async shutdown() {
    await this.#backupsWorker?.close()
    await this.#backupsQueue?.close()

    await this.#paymentsWorker?.close()
    await this.#paymentsQueue?.close()
  }
}
