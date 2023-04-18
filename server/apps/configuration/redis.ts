export const RedisConfig = () => {
  return {
    redis: {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT),
      username: process.env.REDIS_USERNAME,
      password: process.env.REDIS_PASSWORD,
      clients: {
        master_item: process.env.REDIS_MASTER_ITEM,
      },
    },
  }
}
