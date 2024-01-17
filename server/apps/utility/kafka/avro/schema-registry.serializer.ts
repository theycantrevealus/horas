import { SchemaRegistry } from '@kafkajs/confluent-schema-registry'
import { Serializer } from '@nestjs/microservices'
import {
  KafkaAvroRequestSerializerConfig,
  KafkaMessageObject,
  KafkaMessageSend,
  KafkaSchemaMap,
} from '@utility/kafka/avro/interface'

export class KafkaAvroRequestSerializer
  implements Serializer<KafkaMessageSend, Promise<KafkaMessageSend>>
{
  protected registry: SchemaRegistry
  protected schemas: Map<string, KafkaSchemaMap> = new Map()
  protected separator: string
  protected config: KafkaAvroRequestSerializerConfig
  private lastSchemaFetchInterval: Map<string, number> = new Map()

  constructor(options: KafkaAvroRequestSerializerConfig) {
    this.registry = new SchemaRegistry(options.config, options.options)
    this.config = {
      schemaFetchIntervalSeconds: 3600,
      ...options,
    }

    this.getSchemaIds()
  }

  /**
   * Grab the schemaIds for the registry to cache for serialization.
   */
  private async getSchemaIds(): Promise<void> {
    for await (const schema of this.config.schemas.values()) {
      await this.getSchemaId(schema)
    }
  }

  /**
   * Gets a single schema from schema registry.
   *
   * @param schema
   */
  private async getSchemaId(schema): Promise<void | Error> {
    const headersSuffix = schema.headersSuffix ?? 'headers'
    const keySuffix = schema.keySuffix ?? 'key'
    const valueSuffix = schema.valueSuffix ?? 'value'

    try {
      const headersId = await this.registry.getLatestSchemaId(
        `${schema.topic}-${headersSuffix}`
      )
      const keyId =
        (await this.registry.getLatestSchemaId(
          `${schema.topic}-${keySuffix}`
        )) || null
      const valueId = await this.registry.getLatestSchemaId(
        `${schema.topic}-${valueSuffix}`
      )

      this.schemas.set(schema.topic, {
        headersId,
        keyId,
        valueId,
        headersSuffix,
        keySuffix,
        valueSuffix,
      })

      this.lastSchemaFetchInterval.set(schema.topic, Date.now())
    } catch (e) {
      console.error(e)
      throw e
    }
  }

  /**
   * Check the last time we updated the schemas and attempt to update.
   *
   * @param topic
   */
  private async updateSchemas(topic: string): Promise<void> {
    const lastCheck = this.lastSchemaFetchInterval.get(topic)
    const configCheckMs = this.config.schemaFetchIntervalSeconds / 1000
    const now = Date.now()

    if (lastCheck + configCheckMs > now) {
      const config = this.config.schemas.find(
        (schema) => schema.topic === topic
      )
      await this.getSchemaId(config)
    }
  }

  async serialize(value: KafkaMessageSend): Promise<KafkaMessageSend> {
    const outgoingMessage = value
    try {
      await this.updateSchemas(value.topic)

      const schema: KafkaSchemaMap = this.schemas.get(value.topic)
      const { keyId, valueId, headersId } = schema

      const messages: Promise<KafkaMessageObject>[] = value.messages.map(
        async (origMessage) => {
          const encodedHeader: any = origMessage.headers
          let encodedKey = origMessage.key
          const encodedValue = await this.registry.encode(
            valueId,
            origMessage.value
          )

          // if (headersId) {
          //   encodedHeader = await this.registry.encode(
          //     headersId,
          //     origMessage.headers
          //   )
          // }

          if (keyId) {
            encodedKey = await this.registry.encode(keyId, origMessage.key)
          }

          return {
            ...origMessage,
            headers: encodedHeader,
            value: encodedValue,
            key: encodedKey,
          }
        }
      )

      outgoingMessage.messages = await Promise.all(messages)
    } catch (e) {
      throw e
    }
    return outgoingMessage
  }
}
