import { ApplicationConfig } from '@configuration/environtment'
import { KafkaConfig } from '@configuration/kafka'
import { MongoConfig } from '@configuration/mongo'
import { SocketConfig } from '@configuration/socket'
import { ConfigModule, ConfigService } from '@nestjs/config'
import {
  ClientProvider,
  ClientsModuleAsyncOptions,
  Transport,
} from '@nestjs/microservices'
import { environmentIdentifier } from '@utility/environtment'
import * as dotenv from 'dotenv'

dotenv.config({
  path: environmentIdentifier,
})

const devMode = environmentIdentifier

const KafkaConnCoord = (devMode) => {
  return {
    inventory: [
      {
        name: process.env.KAFKA_INVENTORY_SERVICE,
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: environmentIdentifier,
            load: [ApplicationConfig, MongoConfig, KafkaConfig, SocketConfig],
          }),
        ],
        inject: [ConfigService],
        useFactory: async (
          configService: ConfigService
        ): Promise<ClientProvider> => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: configService.get<string>('kafka.inventory.client'),
              brokers: [configService.get<string>('kafka.inventory.broker')],
            },
            consumer: {
              groupId: configService.get<string>('kafka.inventory.cons_group'),
            },
          },
        }),
      },
    ] satisfies ClientsModuleAsyncOptions,
    m_item: [
      {
        name: process.env.KAFKA_M_ITEM_SERVICE,
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: environmentIdentifier,
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
              clientId: configService.get<string>('kafka.master.item.client'),
              brokers: [configService.get<string>('kafka.master.item.broker')],
            },
            consumer: {
              groupId: configService.get<string>(
                'kafka.master.item.cons_group'
              ),
            },
          },
        }),
      },
    ] satisfies ClientsModuleAsyncOptions,
    queue: [
      {
        name: process.env.KAFKA_QUEUE_SERVICE,
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: environmentIdentifier,
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
              clientId: configService.get<string>('kafka.queue.client'),
              brokers: [configService.get<string>('kafka.queue.broker')],
            },
            consumer: {
              groupId: configService.get<string>('kafka.queue.cons_group'),
            },
          },
        }),
      },
    ] satisfies ClientsModuleAsyncOptions,
  }
  // if (devMode) {
  //   return {
  //     inventory: [
  //       {
  //         name: process.env.KAFKA_INVENTORY_SERVICE,
  //         imports: [
  //           ConfigModule.forRoot({
  //             isGlobal: true,
  //             envFilePath: environmentIdentifier,
  //             load: [ApplicationConfig, MongoConfig, KafkaConfig, SocketConfig],
  //           }),
  //         ],
  //         inject: [ConfigService],
  //         useFactory: async (
  //           configService: ConfigService
  //         ): Promise<ClientProvider> => ({
  //           transport: Transport.KAFKA,
  //           options: {
  //             client: {
  //               clientId: configService.get<string>('kafka.inventory.client'),
  //               brokers: [configService.get<string>('kafka.inventory.broker')],
  //             },
  //             consumer: {
  //               groupId: configService.get<string>(
  //                 'kafka.inventory.cons_group'
  //               ),
  //             },
  //           },
  //         }),
  //       },
  //     ] satisfies ClientsModuleAsyncOptions,
  //     m_item: [
  //       {
  //         name: process.env.KAFKA_M_ITEM_SERVICE,
  //         imports: [
  //           ConfigModule.forRoot({
  //             isGlobal: true,
  //             envFilePath: environmentIdentifier,
  //             load: [ApplicationConfig, MongoConfig, KafkaConfig],
  //           }),
  //         ],
  //         inject: [ConfigService],
  //         useFactory: async (
  //           configService: ConfigService
  //         ): Promise<ClientProvider> => ({
  //           transport: Transport.KAFKA,
  //           options: {
  //             client: {
  //               clientId: configService.get<string>('kafka.master.item.client'),
  //               brokers: [
  //                 configService.get<string>('kafka.master.item.broker'),
  //               ],
  //             },
  //             consumer: {
  //               groupId: configService.get<string>(
  //                 'kafka.master.item.cons_group'
  //               ),
  //             },
  //           },
  //         }),
  //       },
  //     ] satisfies ClientsModuleAsyncOptions,
  //     queue: [
  //       {
  //         name: process.env.KAFKA_QUEUE_SERVICE,
  //         imports: [
  //           ConfigModule.forRoot({
  //             isGlobal: true,
  //             envFilePath: environmentIdentifier,
  //             load: [ApplicationConfig, MongoConfig, KafkaConfig],
  //           }),
  //         ],
  //         inject: [ConfigService],
  //         useFactory: async (
  //           configService: ConfigService
  //         ): Promise<ClientProvider> => ({
  //           transport: Transport.KAFKA,
  //           options: {
  //             client: {
  //               clientId: configService.get<string>('kafka.queue.client'),
  //               brokers: [configService.get<string>('kafka.queue.broker')],
  //             },
  //             consumer: {
  //               groupId: configService.get<string>('kafka.queue.cons_group'),
  //             },
  //           },
  //         }),
  //       },
  //     ] satisfies ClientsModuleAsyncOptions,
  //   }
  // } else {
  //   // PROD / PREPROD MODE
  //   return {
  //     inventory: [
  //       {
  //         name: process.env.KAFKA_INVENTORY_SERVICE,
  //         imports: [
  //           ConfigModule.forRoot({
  //             isGlobal: true,
  //             envFilePath: environmentIdentifier,
  //             load: [ApplicationConfig, MongoConfig, KafkaConfig],
  //           }),
  //         ],
  //         inject: [ConfigService],
  //         useFactory: async (
  //           configService: ConfigService
  //         ): Promise<ClientProvider> => ({
  //           transport: Transport.KAFKA,
  //           options: {
  //             client: {
  //               clientId: configService.get<string>('kafka.inventory.client'),
  //               brokers: [configService.get<string>('kafka.inventory.broker')],
  //               ssl: {
  //                 secureProtocol: configService.get<string>(
  //                   'kafka.inventory.ssl.protocol'
  //                 ),
  //                 rejectUnauthorized: false,
  //                 cert: fs.readFileSync(
  //                   configService.get<string>('kafka.inventory.ssl.ca')
  //                 ),
  //                 passphrase: configService.get<string>(
  //                   'kafka.inventory.ssl.passphrase'
  //                 ),
  //               },
  //               sasl: {
  //                 mechanism: 'scram-sha-512',
  //                 username: configService.get<string>(
  //                   'kafka.inventory.sasl.username'
  //                 ),
  //                 password: configService.get<string>(
  //                   'kafka.inventory.sasl.password'
  //                 ),
  //               },
  //             },
  //             consumer: {
  //               groupId: configService.get<string>(
  //                 'kafka.inventory.cons_group'
  //               ),
  //             },
  //           },
  //         }),
  //       },
  //     ] satisfies ClientsModuleAsyncOptions,
  //     m_item: [
  //       {
  //         name: process.env.KAFKA_M_ITEM_SERVICE,
  //         imports: [
  //           ConfigModule.forRoot({
  //             isGlobal: true,
  //             envFilePath: environmentIdentifier,
  //             load: [ApplicationConfig, MongoConfig, KafkaConfig],
  //           }),
  //         ],
  //         inject: [ConfigService],
  //         useFactory: async (
  //           configService: ConfigService
  //         ): Promise<ClientProvider> => ({
  //           transport: Transport.KAFKA,
  //           options: {
  //             client: {
  //               clientId: configService.get<string>('kafka.master.item.client'),
  //               brokers: [
  //                 configService.get<string>('kafka.master.item.broker'),
  //               ],
  //               ssl: {
  //                 secureProtocol: configService.get<string>(
  //                   'kafka.master.item.ssl.protocol'
  //                 ),
  //                 rejectUnauthorized: false,
  //                 cert: fs.readFileSync(
  //                   configService.get<string>('kafka.master.item.ssl.ca')
  //                 ),
  //                 passphrase: configService.get<string>(
  //                   'kafka.master.item.ssl.passphrase'
  //                 ),
  //               },
  //               sasl: {
  //                 mechanism: 'scram-sha-512',
  //                 username: configService.get<string>(
  //                   'kafka.master.item.sasl.username'
  //                 ),
  //                 password: configService.get<string>(
  //                   'kafka.master.item.sasl.password'
  //                 ),
  //               },
  //             },
  //             consumer: {
  //               groupId: configService.get<string>(
  //                 'kafka.master.item.cons_group'
  //               ),
  //             },
  //           },
  //         }),
  //       },
  //     ] satisfies ClientsModuleAsyncOptions,
  //     queue: [
  //       {
  //         name: process.env.KAFKA_QUEUE_SERVICE,
  //         imports: [
  //           ConfigModule.forRoot({
  //             isGlobal: true,
  //             envFilePath: environmentIdentifier,
  //             load: [ApplicationConfig, MongoConfig, KafkaConfig],
  //           }),
  //         ],
  //         inject: [ConfigService],
  //         useFactory: async (
  //           configService: ConfigService
  //         ): Promise<ClientProvider> => ({
  //           transport: Transport.KAFKA,
  //           options: {
  //             client: {
  //               clientId: configService.get<string>('kafka.queue.client'),
  //               brokers: [configService.get<string>('kafka.queue.broker')],
  //               ssl: {
  //                 secureProtocol: configService.get<string>(
  //                   'kafka.queue.ssl.protocol'
  //                 ),
  //                 rejectUnauthorized: false,
  //                 cert: fs.readFileSync(
  //                   configService.get<string>('kafka.queue.ssl.ca')
  //                 ),
  //                 passphrase: configService.get<string>(
  //                   'kafka.queue.ssl.passphrase'
  //                 ),
  //               },
  //               sasl: {
  //                 mechanism: 'scram-sha-512',
  //                 username: configService.get<string>(
  //                   'kafka.queue.sasl.username'
  //                 ),
  //                 password: configService.get<string>(
  //                   'kafka.queue.sasl.password'
  //                 ),
  //               },
  //             },
  //             consumer: {
  //               groupId: configService.get<string>('kafka.queue.cons_group'),
  //             },
  //           },
  //         }),
  //       },
  //     ] satisfies ClientsModuleAsyncOptions,
  //   }
  // }
}

export const KafkaConn = KafkaConnCoord(devMode)
