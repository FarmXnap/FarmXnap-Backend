import { Queue, Worker } from 'bullmq'

export type QueueName = 'payments' | 'backups'

export interface WorkerBootResult {
  queueName: QueueName
  queue: Queue
  worker?: Worker
}

export interface AppWorker {
  boot(): Promise<WorkerBootResult>
}
