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
    const keySuffix = schema.keySuffix ?? 'key'
    const valueSuffix = schema.valueSuffix ?? 'value'

    try {
      const keyId =
        (await this.registry.getLatestSchemaId(
          `${schema.topic}-${keySuffix}`
        )) || null
      const valueId = await this.registry.getLatestSchemaId(
        `${schema.topic}-${valueSuffix}`
      )

      this.schemas.set(schema.topic, {
        keyId,
        valueId,
        keySuffix,
        valueSuffix,
      })

      this.lastSchemaFetchInterval.set(schema.topic, Date.now())
    } catch (e) {
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

      const schema = this.schemas.get(value.topic)
      const { keyId, valueId } = schema

      const messages: Promise<KafkaMessageObject>[] = value.messages.map(
        async (origMessage) => {
          let encodedKey = origMessage.key
          const encodedValue = await this.registry.encode(
            valueId,
            origMessage.value
          )

          if (keyId) {
            encodedKey = await this.registry.encode(keyId, origMessage.key)
          }

          return {
            ...origMessage,
            value: encodedValue,
            key: encodedKey,
          }
        }
      )

      const results = await Promise.all(messages)
      outgoingMessage.messages = results
    } catch (e) {
      throw e
    }

    return outgoingMessage
  }
}
