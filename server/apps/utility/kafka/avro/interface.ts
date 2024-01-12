import { SchemaRegistryAPIClientOptions } from '@kafkajs/confluent-schema-registry/dist/@types'
import { SchemaRegistryAPIClientArgs } from '@kafkajs/confluent-schema-registry/dist/api'
import { Type } from '@nestjs/common'
import { ModuleMetadata } from '@nestjs/common/interfaces'
import { Deserializer, Serializer } from '@nestjs/microservices'
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
  value: any | Buffer | string | null
  key: any
}

export interface KafkaMessageSend extends Omit<ProducerRecord, 'topic'> {
  messages: KafkaMessageObject[]
  topic?: string
}

export interface KafkaSchemaMap {
  keyId: number | null
  valueId: number
  keySuffix: string
  valueSuffix: string
}

type KafkaAvroRequestSerializerSchema = {
  topic: string
  key?: string
  value?: string
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
  }
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
