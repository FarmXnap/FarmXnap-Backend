import DatabaseBackupService from '#services/database_backup_service'
import { Upload } from '@aws-sdk/lib-storage'
import { test } from '@japa/runner'
import sinon from 'sinon'

test.group('Database Backup Service', (group) => {
  group.each.setup(() => {
    return () => {
      sinon.restore()
    }
  })

  test('should execute the backup and trigger the S3 upload')
    .run(async ({ assert }) => {
      const uploadStub = sinon.stub(Upload.prototype, 'done').resolves()

      const dbBackupService = new DatabaseBackupService()
      await dbBackupService.run()

      assert.isTrue(uploadStub.calledOnce, 'The S3 Upload manager was never triggered.')
    })
    .tags(['database_backup_service'])
})
