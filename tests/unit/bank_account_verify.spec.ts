import { test } from '@japa/runner'
import nock from 'nock'
import { paystackBaseUrl } from '../../helpers/utils.js'
import BankService from '#services/bank_service'
import { BANK_DATA } from '#database/seeds/bank_data'
import env from '#start/env'

test.group('Bank Service / Verify Bank Account', (group) => {
  const existingPayStackSecretKey = env.get('PAYSTACK_SECRET_KEY')

  group.setup(() => {
    nock.disableNetConnect() // Stop all outside interet calls
    nock.enableNetConnect('127.0.0.1') // Allow local DB/App connections
  })

  group.teardown(() => {
    nock.enableNetConnect()
  })

  group.each.setup(async () => {
    // No database call

    return async () => {
      nock.recorder.clear() // Wipe any recorded strings
      nock.restore() // Stop recording
      nock.activate() // Immediately re-activate so the next test can use nock again
      nock.cleanAll() // Clear mocks

      // Reset the env to previous state
      env.set('PAYSTACK_SECRET_KEY', existingPayStackSecretKey)
    }
  })

  test('should verify a bank account number: {$self}')
    .with([
      'main_assertion',
      'invalid_bank_account',
      'unauthorized',
      'invalid_authorization',
    ] as const)
    .run(async ({ assert }, condition) => {
      const accountNumber = condition === 'invalid_bank_account' ? '308381386' : '3083813866'
      const bankCode = '011'
      const accountName = 'OKEKE DEBORAH UCHECHUKWU'
      const bankID = BANK_DATA.find((bdata) => bdata.code === bankCode)?.id
      assert.exists(bankID)

      if (condition === 'unauthorized') {
        env.set('PAYSTACK_SECRET_KEY', '')
      }

      if (condition === 'invalid_authorization') {
        env.set('PAYSTACK_SECRET_KEY', 'sk_test_incorrectbcf65a0673ecd708015a0dacdbda39a')
      }

      // Mock the specific API call
      nock(paystackBaseUrl)
        .get(
          `/bank/resolve?account_number=${condition === 'invalid_bank_account' ? '308381386' : accountNumber}&bank_code=${bankCode}`
        )
        .reply(
          condition === 'main_assertion' ? 200 : condition === 'invalid_bank_account' ? 422 : 401,
          {
            status: condition === 'main_assertion',
            message:
              condition === 'main_assertion'
                ? 'Account number resolved'
                : condition === 'invalid_bank_account'
                  ? 'Could not resolve account name. Check parameters or try again.'
                  : condition === 'invalid_authorization'
                    ? 'Invalid key'
                    : 'No Authorization Header was found',
            data:
              condition === 'main_assertion'
                ? {
                    account_number: accountNumber,
                    account_name: accountName,
                    bank_id: bankID,
                  }
                : undefined,
          }
        )

      // Enabling this will disable the interception and make a real request
      // nock.recorder.rec()

      const result = await BankService.verifyBankAccount(bankCode, accountNumber)

      switch (condition) {
        case 'main_assertion':
          assert.containSubset(result, {
            account_number: accountNumber,
            account_name: accountName,
            bank_id: bankID,
          })
          break

        case 'invalid_authorization':
        case 'unauthorized':
          assert.containSubset(result, {
            errorCode: 401,
            message: 'Unauthorized or Invalid authorization',
          })
          break

        case 'invalid_bank_account':
          assert.containSubset(result, {
            errorCode: 422,
            message:
              'Bank Account Verification failed. Ensure the account number and bank are correct.',
          })
          break

        default:
          throw new Error('Invalid condition')
      }
    })
    .tags(['banks', 'bank_service', 'verify_bank_account'])
    .timeout(30000)
})
