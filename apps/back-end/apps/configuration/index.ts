import * as Joi from 'joi'
import { ApplicationSchema } from './application'
import { MongoSchema } from './mongo'
import { LoggerSchema } from './logger'
import { ChangeLogSchema } from './change-log'
import { AuthSchema } from './auth'
import { EncryptionSchema } from './encryption'

export const ConfigSchema = Joi.object()
  .concat(ApplicationSchema)
  .concat(MongoSchema)
  .concat(LoggerSchema)
  .concat(ChangeLogSchema)
  .concat(AuthSchema)

/**
 * Schema of applications that store encrypted fields (the HR gateway): the common settings plus the
 * encryption secrets. Other applications use `ConfigSchema` and need no encryption variables.
 */
export const EncryptedConfigSchema = ConfigSchema.concat(EncryptionSchema)
