import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { Deserializer, Serializer } from '@nestjs/microservices'
import { KafkaResponseDeserializer } from '@nestjs/microservices/deserializers'
import { KafkaRequestSerializer } from '@nestjs/microservices/serializers'
import { environmentName } from '@utility/environtment'
import {
  SUBSCRIBER_MAP,
  SUBSCRIBER_OBJECT_MAP,
} from '@utility/kafka/avro/decorator'
import {
  KafkaMessageSend,
  KafkaModuleOption,
  KafkaTransaction,
} from '@utility/kafka/avro/interface'
import { HorasLogging } from '@utility/logger/interfaces'
import { TimeManagement } from '@utility/time'
import {
  WinstonCustomTransports,
  WinstonLogCreator,
} from '@utility/transport.winston'
import {
  Admin,
  Consumer,
  Kafka,
  logLevel,
  Offsets,
  Producer,
  ProducerConfig,
  RecordMetadata,
  SeekEntry,
  TopicPartitionOffsetAndMetadata,
} from 'kafkajs'
import * as winston from 'winston'

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private kafka: Kafka
  private producer: Producer
  private producerConfig: ProducerConfig
  private consumer: Consumer
  private admin: Admin
  private deserializer: Deserializer
  private serializer: Serializer
  private autoConnect: boolean
  private logger: winston.Logger
  private options: KafkaModuleOption['options']

  protected topicOffsets: Map<
    string,
    (SeekEntry & { high: string; low: string })[]
  > = new Map()

  constructor(options: KafkaModuleOption['options']) {
    this.logger = winston.createLogger({
      transports: WinstonCustomTransports[environmentName],
    })

    const {
      client,
      consumer: consumerConfig,
      producer: producerConfig,
    } = options

    this.kafka = new Kafka({
      ...client,
      logLevel: logLevel.ERROR,
      logCreator: WinstonLogCreator,
    })

    const { groupId } = consumerConfig

    if (!options.producerModeOnly) {
      const consumerOptions = Object.assign(
        {
          groupId: this.getGroupIdSuffix(groupId),
        },
        consumerConfig
      )
      this.consumer = this.kafka.consumer(consumerOptions)
    }

    this.autoConnect = options.autoConnect ?? true
    this.producerConfig = producerConfig
    this.producer = this.kafka.producer(producerConfig)
    this.admin = this.kafka.admin()
    this.initializeDeserializer(options)
    this.initializeSerializer(options)
    this.options = options
  }

  async onModuleInit(): Promise<void> {
    await this.connect()
    await this.getTopicOffsets()
    if (!this.options.producerModeOnly) {
      SUBSCRIBER_MAP.forEach((functionRef, topic) => {
        this.subscribe(topic)
      })
      this.bindAllTopicToConsumer()
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.disconnect()
  }

  /**
   * Connect the kafka service.
   */
  async connect(): Promise<void> {
    if (!this.autoConnect) {
      return
    }

    await this.producer.connect()
    if (!this.options.producerModeOnly) {
      await this.consumer.connect()
    }
    await this.admin.connect()
  }

  /**
   * Disconnects the kafka service.
   */
  async disconnect(): Promise<void> {
    await this.producer.disconnect()
    if (!this.options.producerModeOnly) {
      await this.consumer.disconnect()
    }
    await this.admin.disconnect()
  }

  /**
   * Gets the high, low and partitions of a topic.
   */
  private async getTopicOffsets(): Promise<void> {
    const topics = SUBSCRIBER_MAP.keys()

    for await (const topic of topics) {
      try {
        const topicOffsets = await this.admin.fetchTopicOffsets(topic)
        this.topicOffsets.set(topic, topicOffsets)
      } catch (e) {
        this.logger.error(e)
      }
    }
  }

  /**
   * Subscribes to the topics.
   *
   * @param topic
   */
  private async subscribe(topic: string): Promise<void> {
    await this.consumer.subscribe({
      topic,
      fromBeginning: this.options.consumeFromBeginning || false,
    })
  }

  /**
   * Send/produce a message to a topic.
   *
   * @param message
   */
  async send(message: KafkaMessageSend): Promise<RecordMetadata[]> {
    try {
      if (!this.producer) {
        this.logger.error('There is no producer, unable to send message.')
        return
      }

      const serializedPacket = await this.serializer.serialize(message)
      return await this.producer.send(serializedPacket)
    } catch (e) {
      throw e
    }
  }

  /**
   * Gets the groupId suffix for the consumer.
   *
   * @param groupId
   */
  public getGroupIdSuffix(groupId: string): string {
    return groupId + '-client'
  }

  /**
   * Calls the method you are subscribed to.
   *
   * @param topic
   *  The topic to subscribe to.
   * @param instance
   *  The class instance.
   */
  subscribeToResponseOf<T>(topic: string, instance: T): void {
    SUBSCRIBER_OBJECT_MAP.set(topic, instance)
  }

  /**
   * Returns a new producer transaction in order to produce messages and commit offsets together
   */
  async transaction(id: string): Promise<KafkaTransaction> {
    // const producer = this.producer
    const producer = await this.kafka.producer({
      ...this.producerConfig,
      transactionalId: id,
    })

    await producer.connect()

    if (!producer) {
      throw 'There is no producer, unable to start transactions.'
    }

    const tx = await producer.transaction()
    const _this = this
    const retval: KafkaTransaction = {
      abort(): Promise<void> {
        return tx.abort()
      },
      commit(): Promise<void> {
        return tx.commit()
      },
      isActive(): boolean {
        return tx.isActive()
      },
      async send(message: KafkaMessageSend): Promise<RecordMetadata[]> {
        const serializedPacket = await _this.serializer.serialize(message)
        return await tx.send(serializedPacket)
      },
      sendOffsets(
        offsets: Offsets & { consumerGroupId: string }
      ): Promise<void> {
        return tx.sendOffsets(offsets)
      },
    }
    return retval
  }

  /**
   * Commit consumer offsets manually.
   * Please note that in most cases you will want to use the given __autoCommitThreshold__
   * or use a transaction to atomically set offsets and outgoing messages.
   *
   * @param topicPartitions
   */
  async commitOffsets(
    topicPartitions: Array<TopicPartitionOffsetAndMetadata>
  ): Promise<void> {
    return this.consumer.commitOffsets(topicPartitions)
  }

  /**
   * Sets up the serializer to encode outgoing messages.
   *
   * @param options
   */
  protected initializeSerializer(options: KafkaModuleOption['options']): void {
    this.serializer =
      (options && options.serializer) || new KafkaRequestSerializer()
  }

  /**
   * Sets up the deserializer to decode incoming messages.
   *
   * @param options
   */
  protected initializeDeserializer(
    options: KafkaModuleOption['options']
  ): void {
    this.deserializer =
      (options && options.deserializer) || new KafkaResponseDeserializer()
  }

  /**
   * Runs the consumer and calls the consumers when a message arrives.
   */
  private bindAllTopicToConsumer(): void {
    const runConfig = this.options.consumerRunConfig
      ? this.options.consumerRunConfig
      : {}
    this.consumer.run({
      ...runConfig,
      autoCommit: false,
      // partitionsConsumedConcurrently: 1,
      // eachBatch: async ({
      //   batch,
      //   resolveOffset,
      //   heartbeat,
      //   // commitOffsetsIfNecessary,
      //   // uncommittedOffsets,
      //   // isRunning,
      //   // isStale,
      //   // pause,
      // }) => {
      //   const TM = new TimeManagement()
      //   const topic = batch.topic
      //   const partition = batch.partition

      //   for (const message of batch.messages) {
      //     const objectRef = SUBSCRIBER_OBJECT_MAP.get(topic)
      //     const callback = SUBSCRIBER_MAP.get(topic)
      //     const { timestamp, response, offset, key, headers } =
      //       await this.deserializer.deserialize(message, { topic })

      //     const dataSet: HorasLogging = {
      //       ip: `${topic}/${partition}/${offset}`,
      //       path: topic,
      //       url: topic,
      //       method: 'KAFKA',
      //       takeTime: Date.now() - timestamp,
      //       payload: {
      //         response: response,
      //         key: key,
      //       },
      //       result: response,
      //       account: headers,
      //       time: TM.getTimezone('Asia/Jakarta'),
      //     }

      //     try {
      //       this.logger.verbose(dataSet)
      //       await callback.apply(objectRef, [
      //         response,
      //         key,
      //         offset,
      //         timestamp,
      //         partition,
      //         headers,
      //         this.consumer,
      //       ])
      //     } catch (e) {
      //       dataSet.result = e.message
      //       this.logger.error(dataSet)
      //     }

      //     resolveOffset(offset)
      //     await heartbeat()
      //   }
      // },

      eachMessage: async ({ topic, partition, message }) => {
        const objectRef = SUBSCRIBER_OBJECT_MAP.get(topic)
        const callback = SUBSCRIBER_MAP.get(topic)
        const { timestamp, response, offset, key, headers } =
          await this.deserializer.deserialize(message, { topic })

        const TM = new TimeManagement()
        const dataSet: HorasLogging = {
          ip: `${topic}/${partition}/${offset}`,
          path: topic,
          url: topic,
          method: 'KAFKA',
          takeTime: Date.now() - timestamp,
          payload: {
            response: response,
            key: key,
          },
          result: response,
          account: headers,
          time: TM.getTimezone('Asia/Jakarta'),
        }

        try {
          this.logger.verbose(dataSet)
          await callback.apply(objectRef, [
            response,
            key,
            offset,
            timestamp,
            partition,
            topic,
            this.consumer,
            headers,
          ])
        } catch (e) {
          dataSet.result = e.message
          this.logger.error(dataSet)
        }

        // await this.consumer.commitOffsets([
        //   {
        //     topic: topic,
        //     partition: partition,
        //     offset: (parseInt(offset) + 1).toString(),
        //   },
        // ])
      },
    })

    if (this.options.seek !== undefined) {
      this.seekTopics()
    }
  }

  /**
   * Seeks to a specific offset defined in the config
   * or to the lowest value and across all partitions.
   */
  private seekTopics(): void {
    Object.keys(this.options.seek).forEach((topic) => {
      const topicOffsets = this.topicOffsets.get(topic)
      const seekPoint = this.options.seek[topic]

      topicOffsets.forEach((topicOffset) => {
        let seek = String(seekPoint)

        // Seek by timestamp
        if (typeof seekPoint == 'object') {
          const time = seekPoint as Date
          seek = time.getTime().toString()
        }

        // Seek to the earliest timestamp.
        if (seekPoint === 'earliest') {
          seek = topicOffset.low
        }

        this.consumer.seek({
          topic,
          partition: topicOffset.partition,
          offset: seek,
        })
      })
    })
  }
}
