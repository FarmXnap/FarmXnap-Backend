import type { ApplicationService } from '@adonisjs/core/types'
import { Queue, Worker } from 'bullmq'
import PaymentsWorker from '../app/workers/payments_worker.js'
import BackupsWorker from '../app/workers/backups_worker.js'
import { QueueName } from '#types/queue'

/**
 * @todo: CLean up this file by moving the different workers for backups, payments etc. to separate files and importing here.
 */

export default class QueueProvider {
  constructor(protected app: ApplicationService) {}

  #activeWorkers: Worker[] = []
  #activeQueues: Queue[] = []

  // public readonly processPaymentWebhookJobName = 'process-payment-webhook'

  #queueRegistry: Map<QueueName, Queue> = new Map()

  /**
   * Register bindings to the container
   */
  register() {}

  /**
   * The container bindings have booted
   */
  async boot() {
    const workersToBoot = [PaymentsWorker, BackupsWorker]

    for (const workerClass of workersToBoot) {
      const workerInstance = await this.app.container.make(workerClass)

      const result = await workerInstance.boot()

      if (result) {
        if (result.worker) {
          this.#activeWorkers.push(result.worker)
        }
        if (result.queueName && result.queue) {
          this.#queueRegistry.set(result.queueName, result.queue)

          this.#activeQueues.push(result.queue)
        }
      }
    }
  }

  /**
   * The application has been booted
   */
  async start() {}

  /**
   * The process has been started
   */
  async ready() {}

  public getQueue(queueName: QueueName): Queue {
    const queue = this.#queueRegistry.get(queueName)
    if (!queue) {
      throw new Error(`Queue "${queueName}" has not been initialized.`)
    }
    return queue
  }

  /**
   * Preparing to shutdown the app
   */
  async shutdown() {
    for (const activeWorker of this.#activeWorkers) {
      await activeWorker?.close()
    }
    for (const activeQueue of this.#activeQueues) {
      await activeQueue?.close()
    }
  }
}
