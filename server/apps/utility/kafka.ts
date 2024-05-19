import { ConfigService } from '@nestjs/config'
import { environmentIdentifier } from '@utility/environtment'
import {
  KafkaModuleOption,
  KafkaProviderConfig,
} from '@utility/kafka/avro/interface'
import { KafkaModule } from '@utility/kafka/avro/module'
import { KafkaAvroResponseDeserializer } from '@utility/kafka/avro/schema-registry.deserializer'
import { KafkaAvroRequestSerializer } from '@utility/kafka/avro/schema-registry.serializer'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import { join } from 'path'

dotenv.config({
  path: environmentIdentifier,
})

export function KafkaProvider(
  providerNames: string[],
  configuration: KafkaProviderConfig[]
) {
  const providerLists: KafkaModuleOption[] = []
  return KafkaModule.registerAsync(providerNames, {
    useFactory: async (configService: ConfigService) => {
      configuration.map(async (a) => {
        const schemaList = []
        a.schema.map((b) => {
          schemaList.push({
            topic: configService.get<string>(
              `${a.configClass}.topic.${b.topic}`
            ),
            headers: join(
              __dirname,
              `../apps/utility/kafka/avro/schema/${b.headers}`
            ),
            key: join(__dirname, `../apps/utility/kafka/avro/schema/${b.key}`),
            value: join(
              __dirname,
              `../apps/utility/kafka/avro/schema/${b.value}`
            ),
          })
        })
        providerLists.push({
          name: configService.get<string>(`${a.configClass}.service`),
          options: {
            producerModeOnly: a.producerModeOnly,
            consumer: {
              groupId: configService.get<string>(`${a.configClass}.cons_group`),
            },
            producer: {},
            deserializer: new KafkaAvroResponseDeserializer({
              host: configService.get<string>('schema_registry.host'),
            }),
            serializer: new KafkaAvroRequestSerializer({
              config: {
                host: configService.get<string>('schema_registry.host'),
              },
              schemas: schemaList,
            }),
            client: {
              clientId: configService.get<string>(`${a.configClass}.client`),
              brokers: configService
                .get<string>(`${a.configClass}.broker`)
                .split(','),
              ssl: {
                secureProtocol: configService.get<string>(
                  `${a.configClass}.ssl.protocol`
                ),
                rejectUnauthorized: false,
                ca: [
                  fs.readFileSync(
                    configService.get<string>(`${a.configClass}.ssl.ca`),
                    'utf-8'
                  ),
                ],
                key: fs.readFileSync(
                  configService.get<string>(`${a.configClass}.ssl.key`),
                  'utf-8'
                ),
                passphrase: configService.get<string>(
                  `${a.configClass}.ssl.passphrase`
                ),
              },
              sasl: {
                mechanism: 'scram-sha-512',
                username: configService.get<string>(
                  `${a.configClass}.sasl.username`
                ),
                password: configService.get<string>(
                  `${a.configClass}.sasl.password`
                ),
              },
            },
          },
        })
      })
      return providerLists
    },
    inject: [ConfigService],
  })
}
