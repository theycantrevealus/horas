import { SchemaRegistryAPIClientOptions } from '@kafkajs/confluent-schema-registry/dist/@types'
import { SchemaRegistryAPIClientArgs } from '@kafkajs/confluent-schema-registry/dist/api'
import { Type } from '@nestjs/common'
import { ModuleMetadata } from '@nestjs/common/interfaces'
import { Deserializer, Serializer } from '@nestjs/microservices'
import { KafkaGlobalKey } from '@utility/kafka/avro/schema/global/key'
import {
  ConsumerConfig,
  ConsumerRunConfig,
  KafkaConfig,
  Message,
  ProducerConfig,
  ProducerRecord,
  RecordMetadata,
  Transaction,
} from 'kafkajs'

export interface IHeaders {
  [key: string]: any
}

export interface KafkaResponse<T = any> {
  response: T
  key: string
  timestamp: string
  offset: number
  headers?: IHeaders
}

export interface KafkaMessageObject extends Message {
  headers: any | Buffer | string | null
  value: any | Buffer | string | null
  key: any | KafkaGlobalKey
}

export interface KafkaMessageSend extends Omit<ProducerRecord, 'topic'> {
  messages: KafkaMessageObject[]
  topic?: string
}

export interface KafkaSchemaMap {
  headersId: number | null
  keyId: number | null
  valueId: number
  headersSuffix: string
  keySuffix: string
  valueSuffix: string
}

type KafkaAvroRequestSerializerSchema = {
  topic: string
  headers?: string | any
  key?: string
  value?: string
  headersSuffix?: string
  keySuffix?: string
  valueSuffix?: string
}

export type KafkaAvroRequestSerializerConfig = {
  schemas: KafkaAvroRequestSerializerSchema[]
  config: SchemaRegistryAPIClientArgs
  options?: SchemaRegistryAPIClientOptions
  schemaSeparator?: string
  schemaFetchIntervalSeconds?: number
}

export interface KafkaTransaction
  extends Omit<Transaction, 'send' | 'sendBatch'> {
  send(message: KafkaMessageSend): Promise<RecordMetadata[]>
}

export interface KafkaModuleOption {
  name: string
  options: {
    client: KafkaConfig
    consumer: ConsumerConfig
    consumerRunConfig?: ConsumerRunConfig
    producer?: ProducerConfig
    deserializer?: Deserializer
    serializer?: Serializer
    consumeFromBeginning?: boolean
    seek?: Record<string, number | 'earliest' | Date>
    autoConnect?: boolean
    producerModeOnly: boolean
  }
}

interface KafkaProviderConfigSchema {
  topic: string
  headers?: string
  key: string
  value: string
}

export interface KafkaProviderConfig {
  configClass: string
  producerModeOnly: boolean
  schema: KafkaProviderConfigSchema[]
}

export interface KafkaOptionsFactory {
  creatKafkaModuleOptions(): Promise<KafkaModuleOption[]> | KafkaModuleOption[]
}

export interface KafkaModuleOptionsAsync
  extends Pick<ModuleMetadata, 'imports'> {
  inject?: any[]
  useExisting?: Type<KafkaOptionsFactory>
  useClass?: Type<KafkaOptionsFactory>
  useFactory?: (
    ...args: any[]
  ) => Promise<KafkaModuleOption[]> | KafkaModuleOption[]
}
