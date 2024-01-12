import { SchemaRegistry } from '@kafkajs/confluent-schema-registry'
import { SchemaRegistryAPIClientOptions } from '@kafkajs/confluent-schema-registry/dist/@types'
import { SchemaRegistryAPIClientArgs } from '@kafkajs/confluent-schema-registry/dist/api'
import { Injectable } from '@nestjs/common'
import { Deserializer } from '@nestjs/microservices'
import { KafkaResponseDeserializer } from '@nestjs/microservices/deserializers'
import { KafkaResponse } from '@utility/kafka/avro/interface'

@Injectable()
export class KafkaAvroResponseDeserializer
  implements Deserializer<any, Promise<KafkaResponse>>
{
  protected registry: SchemaRegistry
  protected fallback: KafkaResponseDeserializer

  constructor(
    config: SchemaRegistryAPIClientArgs,

    options?: SchemaRegistryAPIClientOptions
  ) {
    this.registry = new SchemaRegistry(config, options)
    this.fallback = new KafkaResponseDeserializer()
  }

  async deserialize(message: any): Promise<KafkaResponse> {
    const { value, key, timestamp, offset } = message
    const decodeResponse = {
      response: value,
      key,
      timestamp,
      offset,
    }

    try {
      decodeResponse.key =
        message.key?.length > 0 ? await this.registry.decode(message.key) : null
      decodeResponse.response = message.value
        ? await this.registry.decode(message.value)
        : message.value
    } catch (e) {
      console.log(e)
      const msg = this.fallback.deserialize(message)
      Object.assign(decodeResponse, msg)
    }

    return decodeResponse
  }
}
