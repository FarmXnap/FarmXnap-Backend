import env from '#start/env'
import logger from '@adonisjs/core/services/logger'
import type { ApplicationService } from '@adonisjs/core/types'
import { Queue, Worker, Job } from 'bullmq'

export default class QueueProvider {
  constructor(protected app: ApplicationService) {}

  #worker?: Worker
  #backupsQueue?: Queue

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

    const dbBackupsJobName = 'daily-db-backups'

    // Create the worker
    this.#worker = new Worker(
      backupsQueueName,
      async (job: Job) => {
        try {
          if (job.name === dbBackupsJobName) {
            logger.info(
              { jobId: job.id, jobName: job.name },
              '[Queue Provider] Database Backup job picked up by worker.'
            )

            /**
             * @todo: call the backup service here
             */
          }
        } catch (error) {
          logger.error(
            { err: error, jobId: job.id, jobName: job.name },
            `[Queue Provider] Job failed.`
          )
          throw error // Re-throw error for retry attempt.
        }
      },
      { connection }
    )

    this.#worker.on('error', (error) => {
      logger.error({ err: error }, '[Queue Provider] Worker error.')
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

  /**
   * Preparing to shutdown the app
   */
  async shutdown() {
    await this.#worker?.close()
    await this.#backupsQueue?.close()
  }
}
