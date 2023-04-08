import { ApplicationConfig } from '@configuration/environtment'
import { KafkaConfig } from '@configuration/kafka'
import { MongoConfig } from '@configuration/mongo'
import { ConfigModule, ConfigService } from '@nestjs/config'
import {
  ClientProvider,
  ClientsModuleAsyncOptions,
  Transport,
} from '@nestjs/microservices'
import * as dotenv from 'dotenv'
import * as fs from 'fs'

dotenv.config({
  path:
    !process.env.NODE_ENV ||
    process.env.NODE_ENV === '' ||
    process.env.NODE_ENV === 'development'
      ? `environment/.env`
      : `environment/${process.env.NODE_ENV}.env`,
})

const devMode =
  !process.env.NODE_ENV ||
  process.env.NODE_ENV === '' ||
  process.env.NODE_ENV === 'development'

const KafkaConnCoord = (devMode) => {
  if (devMode) {
    return {
      inventory: [
        {
          name: process.env.KAFKA_INVENTORY_SERVICE,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/environment/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [ApplicationConfig, MongoConfig, KafkaConfig],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>('kafka.inventory.topic'),
                brokers: [configService.get<string>('kafka.inventory.broker')],
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.inventory.cons_group'
                ),
              },
            },
          }),
        },
      ] satisfies ClientsModuleAsyncOptions,
    }
  } else {
    // PROD / PREPROD MODE
    return {
      inventory: [
        {
          name: process.env.KAFKA_INVENTORY_SERVICE,
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: `${process.cwd()}/environment/${
                !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                  ? ''
                  : process.env.NODE_ENV
              }.env`,
              load: [ApplicationConfig, MongoConfig, KafkaConfig],
            }),
          ],
          inject: [ConfigService],
          useFactory: async (
            configService: ConfigService
          ): Promise<ClientProvider> => ({
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: configService.get<string>('kafka.inventory.topic'),
                brokers: [configService.get<string>('kafka.inventory.broker')],
                ssl: {
                  secureProtocol: configService.get<string>(
                    'kafka.inventory.ssl.protocol'
                  ),
                  rejectUnauthorized: false,
                  cert: fs.readFileSync(
                    configService.get<string>('kafka.inventory.ssl.ca')
                  ),
                  passphrase: configService.get<string>(
                    'kafka.inventory.ssl.passphrase'
                  ),
                },
                sasl: {
                  mechanism: 'scram-sha-512',
                  username: configService.get<string>(
                    'kafka.inventory.sasl.username'
                  ),
                  password: configService.get<string>(
                    'kafka.inventory.sasl.password'
                  ),
                },
              },
              consumer: {
                groupId: configService.get<string>(
                  'kafka.inventory.cons_group'
                ),
              },
            },
          }),
        },
      ] satisfies ClientsModuleAsyncOptions,
    }
  }
}

export const KafkaConn = KafkaConnCoord(devMode)
