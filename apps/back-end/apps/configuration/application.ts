import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

export const ApplicationSchema = Joi.object({
  APP_NAME: Joi.string().required(),
  APP_DB: Joi.string().required(),
});

export const ApplicationConfig = registerAs('app', () => ({
  name: process.env.APP_NAME,
  db: process.env.APP_DB,
}));
