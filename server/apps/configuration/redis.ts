import { ConfigModule, ConfigService } from '@nestjs/config'
import { environmentIdentifier } from '@utility/environtment'
import * as dotenv from 'dotenv'

dotenv.config({
  path: environmentIdentifier,
})
export const RedisConfig = () => {
  return {
    redis: {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT),
      username: process.env.REDIS_USERNAME,
      password: process.env.REDIS_PASSWORD,
      clients: {
        master_item: process.env.REDIS_MASTER_ITEM,
        stock: {
          host: process.env.REDIS_STOCK_HOST,
          port: process.env.REDIS_STOCK_PORT,
        },
      },
      topics: process.env.REDIS_TOPIC,
    },
  }
}

export const RedisStock = {
  name: process.env.REDIS_STOCK,
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (configService: ConfigService) => {
    if (configService.get<string>('redis.password') !== '') {
      // return {
      //   url: `redis://${configService.get<string>('redis.password')}@${configService.get<string>('redis.host')}:${configService.get<string>('redis.port')}`,
      // }
      return {
        connection: {
          host: configService.get<string>('redis.host'),
          port: +configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password'),
        },
      }
    } else {
      // return {
      //   url: `redis://${configService.get<string>('redis.host')}:${configService.get<string>('redis.port')}`,
      // }
      return {
        connection: {
          host: configService.get<string>('redis.host'),
          port: +configService.get<number>('redis.port'),
        },
      }
    }
  },
}
