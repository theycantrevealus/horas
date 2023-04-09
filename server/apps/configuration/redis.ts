export const RedisConfig = () => ({
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT),
    clients: {
      master_item: process.env.REDIS_MASTER_ITEM,
    },
  },
})
