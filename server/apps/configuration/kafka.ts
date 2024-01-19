import * as process from 'process'

export const KafkaConfig = () => {
  return {
    schema_registry: {
      host: process.env.KAFKA_SCHEMA_REGISTRY_SERVER,
    },
    kafka: {
      master: {
        item: {
          service: process.env.KAFKA_M_ITEM_SERVICE,
          topic: {
            master: {
              item: process.env.KAFKA_M_ITEM_TOPIC,
            },
          },
          client: process.env.KAFKA_M_ITEM_CLIENT_ID,
          broker: process.env.KAFKA_M_ITEM_BROKER,
          cons_group: process.env.KAFKA_M_ITEM_CONSUMER_GROUP,
          ssl: {
            protocol: process.env.KAFKA_M_ITEM_SSL_SCP,
            ca: process.env.KAFKA_M_ITEM_SSL_CA,
            passphrase: process.env.KAFKA_M_ITEM_SSL_PASSPHRASE,
          },
          sasl: {
            mechanism: process.env.KAFKA_M_ITEM_SASL_MECHANISM,
            username: process.env.KAFKA_M_ITEM_SASL_USERNAME,
            password: process.env.KAFKA_M_ITEM_SASL_PASSWORD,
          },
        },
      },
      account: {
        port: {
          transport: process.env.KAFKA_ACCOUNT_PORT_TRANSPORT,
          service: process.env.KAFKA_ACCOUNT_PORT_SERVICE,
        },
        service: process.env.KAFKA_ACCOUNT_SERVICE,
        topic: {
          account: process.env.KAFKA_ACCOUNT_TOPIC_ACCOUNT,
        },
        client: process.env.KAFKA_ACCOUNT_CLIENT_ID,
        broker: process.env.KAFKA_ACCOUNT_BROKER,
        cons_group: process.env.KAFKA_ACCOUNT_CONSUMER_GROUP,
        ssl: {
          protocol: process.env.KAFKA_ACCOUNT_SSL_SCP,
          ca: process.env.KAFKA_ACCOUNT_SSL_CA,
          key: process.env.KAFKA_ACCOUNT_SSL_KEY,
          passphrase: process.env.KAFKA_ACCOUNT_SSL_PASSPHRASE,
        },
        sasl: {
          mechanism: process.env.KAFKA_ACCOUNT_SASL_MECHANISM,
          username: process.env.KAFKA_ACCOUNT_SASL_USERNAME,
          password: process.env.KAFKA_ACCOUNT_SASL_PASSWORD,
        },
      },
      inventory: {
        service: process.env.KAFKA_INVENTORY_SERVICE,
        topic: {
          purchase_order: process.env.KAFKA_INVENTORY_TOPIC_PURCHASE_ORDER,
          general_receive_note:
            process.env.KAFKA_INVENTORY_TOPIC_GENERAL_RECEIVE_NOTE,
        },
        client: process.env.KAFKA_INVENTORY_CLIENT_ID,
        broker: process.env.KAFKA_INVENTORY_BROKER,
        cons_group: process.env.KAFKA_INVENTORY_CONSUMER_GROUP,
        ssl: {
          protocol: process.env.KAFKA_INVENTORY_SSL_SCP,
          ca: process.env.KAFKA_INVENTORY_SSL_CA,
          passphrase: process.env.KAFKA_INVENTORY_SSL_PASSPHRASE,
        },
        sasl: {
          mechanism: process.env.KAFKA_INVENTORY_SASL_MECHANISM,
          username: process.env.KAFKA_INVENTORY_SASL_USERNAME,
          password: process.env.KAFKA_INVENTORY_SASL_PASSWORD,
        },
      },
      queue: {
        service: process.env.KAFKA_QUEUE_SERVICE,
        topic: {
          queue: process.env.KAFKA_QUEUE_TOPIC_QUEUE,
        },
        client: process.env.KAFKA_QUEUE_CLIENT_ID,
        broker: process.env.KAFKA_QUEUE_BROKER,
        cons_group: process.env.KAFKA_QUEUE_CONSUMER_GROUP,
        ssl: {
          protocol: process.env.KAFKA_QUEUE_SSL_SCP,
          ca: process.env.KAFKA_QUEUE_SSL_CA,
          passphrase: process.env.KAFKA_QUEUE_SSL_PASSPHRASE,
        },
        sasl: {
          mechanism: process.env.KAFKA_QUEUE_SASL_MECHANISM,
          username: process.env.KAFKA_QUEUE_SASL_USERNAME,
          password: process.env.KAFKA_QUEUE_SASL_PASSWORD,
        },
      },
    },
  }
}
