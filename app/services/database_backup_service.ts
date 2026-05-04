import env from '#start/env'
import logger from '@adonisjs/core/services/logger'
import { S3Client } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { DateTime } from 'luxon'
import { spawn } from 'node:child_process'
import path from 'node:path'
import os from 'node:os'
import { unlink, writeFile } from 'node:fs/promises'

export default class DatabaseBackupService {
  public async run() {
    const user = env.get('DB_USER')
    const host = env.get('DB_HOST')
    const port = env.get('DB_PORT')
    const dbName = env.get('DB_DATABASE')

    const pgPassPath = path.join(os.tmpdir(), `.pgpass-${DateTime.now().toMillis()}`)

    await writeFile(pgPassPath, `${host}:${port}:${dbName}:${user}:${env.get('DB_PASSWORD')}`, {
      mode: 0o600,
    })

    const s3Client = new S3Client({
      region: env.get('AWS_REGION'),
      credentials: {
        accessKeyId: env.get('DB_BACKUP_AWS_ACCESS_KEY_ID'),
        secretAccessKey: env.get('DB_BACKUP_AWS_SECRET_ACCESS_KEY'),
      },
    })

    const fileName = `${env.get('NODE_ENV') /**Different folders per environment in the bucket */}/db-backup-${DateTime.now().toFormat('yyyy-MM-dd-HHmm')}.dump`

    logger.info({ fileName }, '[DatabaseBackupService.run] Starting database backup...')

    const backupProcess = spawn(
      'pg_dump',
      [
        '-U',
        user,
        '-h',
        host,
        '-p',
        port.toString(),
        '-Fc' /** Custom binary format. Must be restored with `pg_restore` */,
        '-d',
        dbName,
      ],
      { env: { ...process.env, PGPASSFILE: pgPassPath } }
    )

    // Listen for any pg_dump errors
    let errorOutput = ''
    backupProcess.stderr.on('data', (data) => {
      errorOutput += data.toString()
    })

    backupProcess.stderr.on('error', (err) => {
      logger.error(
        { err },
        '[DatabaseBackupService.run] The backup process stderr stream encountered an error.'
      )
    })

    const backupProcessExit = new Promise((resolve, reject) => {
      backupProcess.on('close', (code, signal) => {
        if (code !== 0 || signal !== null) {
          // Reject partial uploads so that the queue knows it failed
          reject(
            new Error(
              `pg_dump stopped. Code: ${code}. Signal: ${signal}. Error Output: ${errorOutput}`
            )
          )
        } else {
          resolve(true)
        }
      })
    })

    /**
     * NB: We use '@aws-sdk/lib-storage' instead of drive.putStream() because
     * pg_dump output is a stream of unknown length. Standard S3 PutObject
     * requests require a Content-Length header, which is unavailable here.
     * The Upload manager handles buffering, ensuring memory-efficiency without needing to load the database dump into memory.
     */
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: env.get('DB_BACKUP_S3_BUCKET'),
        Key: fileName,
        Body: backupProcess.stdout, // Stream pg_dump output directly to S3
        ContentType: 'application/octet-stream',
      },
    })

    try {
      // Sync the S3 upload completion and pg_dump process exit
      await Promise.all([upload.done(), backupProcessExit])

      logger.info({ fileName }, '[DatabaseBackupService.run] Database backup successful.')
    } catch (error) {
      logger.error(
        { err: error, pgError: errorOutput, fileName },
        '[DatabaseBackupService.run] Database backup failed.'
      )

      try {
        // Tell S3 to dump partial uploads
        await upload.abort()
        /**
         * NB: Rule to delete incomplete multipart uploads
         * after some days is set in S3.
         */
      } catch (abortError) {
        logger.warn({ err: abortError }, '[DatabaseBackupService.run] Failed to abort S3 upload.')
      }

      throw error // Re-throw error so that the queue knows it failed
    } finally {
      try {
        await unlink(pgPassPath)
      } catch (e) {
        logger.warn(
          { err: e, pgPassPath },
          '[DatabaseBackupService.run] Failed to delete temporary .pgpass file.'
        )
      }
    }
  }
}
