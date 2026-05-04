/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'

const environments = ['development', 'production', 'test'] as const

export default await Env.create(new URL('../', import.meta.url), {
  NODE_ENV: Env.schema.enum(environments),
  APP_ENV: Env.schema.enum.optional([...environments, 'staging'] as const),
  PORT: Env.schema.number(),
  APP_KEY: Env.schema.string(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']),

  /*
  |----------------------------------------------------------
  | Variables for configuring database connection
  |----------------------------------------------------------
  */
  DB_HOST: Env.schema.string(),
  DB_PORT: Env.schema.number(),
  DB_USER: Env.schema.string(),
  DB_PASSWORD: Env.schema.string(),
  DB_DATABASE: Env.schema.string(),
  DATABASE_URL: Env.schema.string.optional(),
  ADMIN_SECRET_KEY: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for configuring the drive package
  |----------------------------------------------------------
  */
  DRIVE_DISK: Env.schema.enum(['fs', 's3'] as const),
  AWS_ACCESS_KEY_ID: Env.schema.string(),
  AWS_SECRET_ACCESS_KEY: Env.schema.string(),
  AWS_REGION: Env.schema.string(),
  S3_BUCKET: Env.schema.string(),
  S3_ENDPOINT: Env.schema.string(),
  DB_BACKUP_AWS_ACCESS_KEY_ID: Env.schema.string(),
  DB_BACKUP_AWS_SECRET_ACCESS_KEY: Env.schema.string(),
  DB_BACKUP_S3_BUCKET: Env.schema.string(),
  GEMINI_API_KEY: Env.schema.string(),
  INTERSWITCH_MERCHANT_CODE: Env.schema.string(),
  INTERSWITCH_PAY_ITEM_ID: Env.schema.string(),
  INTERSWITCH_SECRET_KEY: Env.schema.string(),
  PAYSTACK_SECRET_KEY: Env.schema.string(),
  REDIS_HOST: Env.schema.string({ format: 'host' }),
  REDIS_PORT: Env.schema.number(),
  REDIS_PASSWORD: Env.schema.string.optional(),
  REDIS_DB: Env.schema.number(),
})
