export const KafkaConfig = () => {
  return {
    kafka: {
      master: {
        item: {
          service: process.env.KAFKA_M_ITEM_SERVICE,
          topic: process.env.KAFKA_M_ITEM_TOPIC,
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
      inventory: {
        service: process.env.KAFKA_INVENTORY_SERVICE,
        topic: process.env.KAFKA_INVENTORY_TOPIC,
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
    },
  }
}
