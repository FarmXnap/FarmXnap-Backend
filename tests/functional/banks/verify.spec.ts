import { test } from '@japa/runner'
import BankService from '#services/bank_service'
import sinon from 'sinon'
import { faker } from '@faker-js/faker'

test.group('Banks / Verify Bank Account', (group) => {
  group.each.setup(async () => {
    // No database call

    return () => sinon.restore()
  })

  test('should verify a bank account: {$self}')
    .with([
      'main_assertion',
      'bank_code_not_provided',
      'account_number_not_provided',
      'account_number_length_not_valid',
      'invalid_bank_account',
      'unauthorized',
      'invalid_authorization',
    ] as const)
    .run(async ({ client, route }, condition) => {
      const payload = {
        bank_code:
          condition === 'bank_code_not_provided'
            ? undefined
            : condition === 'invalid_bank_account'
              ? '012'
              : '011',
        bank_account_number:
          condition === 'account_number_not_provided'
            ? undefined
            : condition === 'account_number_length_not_valid'
              ? '308381'
              : '3083813866',
      }

      const accountName = faker.person.fullName()
      const bankId = faker.number.int()

      const pastInitialValidation =
        condition === 'main_assertion' ||
        condition === 'invalid_bank_account' ||
        condition === 'invalid_authorization' ||
        condition === 'unauthorized'

      if (pastInitialValidation) {
        // Stub the Bank verification service and mock the responses
        sinon.stub(BankService, 'verifyBankAccount').resolves(
          condition === 'main_assertion'
            ? {
                account_number: payload.bank_account_number!,
                account_name: accountName,
                bank_id: bankId,
              }
            : condition === 'invalid_bank_account'
              ? {
                  errorCode: 422,
                  message:
                    'Bank Account Verification failed. Ensure the account number and bank are correct.',
                }
              : {
                  errorCode: 401,
                  message: 'We could not verify your bank account. Please try again later.',
                }
        )
      }

      const response = await client.post(route('api.v1.banks.verify')).json(payload)

      if (!pastInitialValidation || condition === 'invalid_bank_account') {
        response.assertStatus(422)

        return response.assertBodyContains({
          errors: [
            condition === 'bank_code_not_provided'
              ? 'Bank Code is required.'
              : condition === 'account_number_not_provided'
                ? 'Bank Account Number is required.'
                : condition === 'account_number_length_not_valid'
                  ? 'Bank Account Number must be 10 digits.'
                  : /** condition === 'invalid_bank_account' */ 'Bank Account Verification failed. Ensure the account number and bank are correct.',
          ],
        })
      }

      if (condition === 'unauthorized' || condition === 'invalid_authorization') {
        response.assertStatus(500)

        return response.assertBodyContains({
          error: 'We could not verify your bank account. Please try again later.',
        })
      }

      response.assertStatus(200)

      response.assertBodyContains({
        data: {
          account_name: accountName,
          account_number: payload.bank_account_number,
        },
      })
    })
    .tags(['banks', 'verify_bank_account'])
})
