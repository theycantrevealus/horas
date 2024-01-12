import {
  Inject,
  Injectable,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { KafkaAvroRequestSerializer } from '@utility/kafka/avro/schema-registry.serializer'
import * as fs from 'fs'
import { Kafka, ProducerRecord } from 'kafkajs'
import { join } from 'path'

@Injectable()
export class KafkaProducer implements OnModuleInit, OnApplicationShutdown {
  private kafka
  private producer
  private registry

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService
  ) {
    this.registry = new KafkaAvroRequestSerializer({
      config: {
        host: this.configService.get<string>('schema_registry.host'),
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
    })
    this.kafka = new Kafka({
      clientId: this.configService.get<string>('kafka.account.client'),
      brokers: this.configService
        .get<string>('kafka.account.broker')
        .split(','),
      ssl: {
        secureProtocol: this.configService.get<string>(
          'kafka.account.ssl.protocol'
        ),
        rejectUnauthorized: false,
        ca: [
          fs.readFileSync(
            this.configService.get<string>('kafka.account.ssl.ca'),
            'utf-8'
          ),
        ],
        key: fs.readFileSync(
          this.configService.get<string>('kafka.account.ssl.key'),
          'utf-8'
        ),
        passphrase: this.configService.get<string>(
          'kafka.account.ssl.passphrase'
        ),
      },
      sasl: {
        mechanism: 'scram-sha-512',
        username: this.configService.get<string>('kafka.account.sasl.username'),
        password: this.configService.get<string>('kafka.account.sasl.password'),
      },
    })

    this.producer = this.kafka.producer()
  }
  async onApplicationShutdown() {
    await this.producer.disconnect()
  }

  async onModuleInit() {
    await this.producer.connect()
  }

  async produce(record: ProducerRecord) {
    const payload = await this.registry.serialize(record)
    await this.producer.send(payload).catch((e) => {
      console.error(e)
    })
  }
}
