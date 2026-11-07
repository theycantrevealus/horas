import * as Joi from 'joi';
import { ApplicationSchema } from './application';
import { MongoSchema } from './mongo';
import { LoggerSchema } from './logger';
import { ChangeLogSchema } from './change-log';
import { AuthSchema } from './auth';

export const ConfigSchema = Joi.object()
  .concat(ApplicationSchema)
  .concat(MongoSchema)
  .concat(LoggerSchema)
  .concat(ChangeLogSchema)
  .concat(AuthSchema);
