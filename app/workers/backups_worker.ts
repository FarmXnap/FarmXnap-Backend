import DatabaseBackupService from '#services/database_backup_service'
import env from '#start/env'
import { QueueName } from '#types/queue'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import { Queue, Worker, Job } from 'bullmq'

export default class BackupsWorker {
  #worker?: Worker
  #queue?: Queue
  #queueName: QueueName = 'backups'

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
    this.#queue = new Queue(backupsQueueName, {
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
    if (!app.inProduction) {
      return { queue: this.#queue, worker: undefined }
    }

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

            // Call the database backup service
            const dbBackupService = await app.container.make(DatabaseBackupService)
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

    this.#worker.on('error', (error) => {
      logger.error({ err: error }, '[Queue Provider] Backups worker error.')
    })

    // Add a job to the queue
    await this.#queue.add(
      dbBackupsJobName,
      {},
      {
        repeat: { pattern: '0 0 * * *' /** Every day at midnight (server time) */ },
        jobId: dbBackupsJobName,
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
