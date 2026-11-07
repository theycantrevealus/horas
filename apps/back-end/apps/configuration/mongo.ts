import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

export const MongoSchema = Joi.object({
  MONGO_URL: Joi.string().required(),
  MONGO_USER: Joi.string().required(),
  MONGO_PASSWORD: Joi.string().required(),
  MONGO_DB_NAME: Joi.string().required(),
});

export const MongoConfig = registerAs('mongo', () => ({
  url: process.env.MONGO_URL,
  user: process.env.MONGO_USER,
  password: process.env.MONGO_PASSWORD,
  dbName: process.env.MONGO_DB_NAME,
}));
