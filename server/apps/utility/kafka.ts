import { ApplicationConfig } from '@configuration/environtment'
import { KafkaConfig } from '@configuration/kafka'
import { MongoConfig } from '@configuration/mongo'
import { ConfigModule, ConfigService } from '@nestjs/config'
import {
  ClientProvider,
  ClientsModuleAsyncOptions,
  Transport,
} from '@nestjs/microservices'
import { environmentIdentifier } from '@utility/environtment'
import { KafkaAvroResponseDeserializer } from '@utility/kafka/avro/schema-registry.deserializer'
import { KafkaAvroRequestSerializer } from '@utility/kafka/avro/schema-registry.serializer'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import { join } from 'path'

dotenv.config({
  path: environmentIdentifier,
})

const KafkaConnCoord = () => {
  return {
    account: [
      {
        name: process.env.KAFKA_ACCOUNT_SERVICE,
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
              clientId: configService.get<string>('kafka.account.client'),
              brokers: configService
                .get<string>('kafka.account.broker')
                .split(','),
              ssl: {
                secureProtocol: configService.get<string>(
                  'kafka.account.ssl.protocol'
                ),
                rejectUnauthorized: false,
                ca: [
                  fs.readFileSync(
                    configService.get<string>('kafka.account.ssl.ca'),
                    'utf-8'
                  ),
                ],
                key: fs.readFileSync(
                  configService.get<string>('kafka.account.ssl.key'),
                  'utf-8'
                ),
                passphrase: configService.get<string>(
                  'kafka.account.ssl.passphrase'
                ),
              },
              sasl: {
                mechanism: 'scram-sha-512',
                username: configService.get<string>(
                  'kafka.account.sasl.username'
                ),
                password: configService.get<string>(
                  'kafka.account.sasl.password'
                ),
              },
            },
            consumer: {
              groupId: configService.get<string>('kafka.account.cons_group'),
            },
            deserializer: new KafkaAvroResponseDeserializer({
              host: configService.get<string>('schema_registry.host'),
            }),
            serializer: new KafkaAvroRequestSerializer({
              config: {
                host: configService.get<string>('schema_registry.host'),
              },
              schemas: [
                {
                  topic: 'account',
                  key: join(
                    __dirname,
                    'apps/utility/kafka/avro/schema/account/key.avsc'
                  ),
                  value: join(
                    __dirname,
                    'apps/utility/kafka/avro/schema/account/value.avsc'
                  ),
                },
              ],
            }),
          },
        }),
      },
    ],
    inventory: [
      {
        name: process.env.KAFKA_INVENTORY_SERVICE,
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
              clientId: configService.get<string>('kafka.inventory.client'),
              brokers: configService
                .get<string>('kafka.inventory.broker')
                .split(','),
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
              brokers: configService
                .get<string>('kafka.master.item.broker')
                .split(','),
              ssl: {
                secureProtocol: configService.get<string>(
                  'kafka.master.item.ssl.protocol'
                ),
                rejectUnauthorized: false,
                cert: fs.readFileSync(
                  configService.get<string>('kafka.master.item.ssl.ca')
                ),
                passphrase: configService.get<string>(
                  'kafka.master.item.ssl.passphrase'
                ),
              },
              sasl: {
                mechanism: 'scram-sha-512',
                username: configService.get<string>(
                  'kafka.master.item.sasl.username'
                ),
                password: configService.get<string>(
                  'kafka.master.item.sasl.password'
                ),
              },
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
              brokers: configService
                .get<string>('kafka.queue.broker')
                .split(','),
              ssl: {
                secureProtocol: configService.get<string>(
                  'kafka.queue.ssl.protocol'
                ),
                rejectUnauthorized: false,
                // ca: [
                //   fs.readFileSync(
                //     '/media/takashitanaka/DATA/grafana/certificates/broker/localhost.ca-cert',
                //     'utf-8'
                //   ),
                // ],
                // key: fs.readFileSync(
                //   '/media/takashitanaka/DATA/grafana/certificates/broker/localhost.ca-key',
                //   'utf-8'
                // ),
                cert: fs.readFileSync(
                  '/media/takashitanaka/DATA/grafana/kafka/kafka-security-ssl-sasl/secrets/kafkacat-ca1-signed.pem',
                  'utf-8'
                ),
                passphrase: 'kalijati123',
              },
              // sasl: {
              //   mechanism: 'scram-sha-512',
              //   username: 'tanaka',
              //   password: 'kalijati123',
              // },
            },
            consumer: {
              groupId: configService.get<string>('kafka.queue.cons_group'),
            },
          },
        }),
      },
    ] satisfies ClientsModuleAsyncOptions,
  }

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

export const KafkaConn = KafkaConnCoord()
