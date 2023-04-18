export const MongoConfig = () => {
  return {
    mongo: {
      host: process.env.MONGO_HOST,
      port: parseInt(process.env.MONGO_PORT),
      db_name: process.env.MONGO_DB_NAME,
      db_user: process.env.MONGO_DB_USER,
      db_password: process.env.MONGO_DB_PASSWORD,
      uri:
        process.env.MONGO_DB_USER !== '' && process.env.MONGO_DB_PASSWORD !== ''
          ? `mongodb://${process.env.MONGO_DB_USER}:${process.env.MONGO_DB_PASSWORD}@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/${process.env.MONGO_DB_NAME}`
          : `mongodb://${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/${process.env.MONGO_DB_NAME}`,
    },
    mongo_test: {
      host: process.env.TEST_MONGO_HOST,
      port: parseInt(process.env.TEST_MONGO_PORT),
      db_name: process.env.TEST_MONGO_DB_NAME,
      db_user: process.env.TEST_MONGO_DB_USER,
      db_password: process.env.TEST_MONGO_DB_PASSWORD,
      uri:
        process.env.TEST_MONGO_DB_USER !== '' &&
        process.env.TEST_MONGO_DB_PASSWORD !== ''
          ? `mongodb://${process.env.TEST_MONGO_DB_USER}:${process.env.TEST_MONGO_DB_PASSWORD}@${process.env.TEST_MONGO_HOST}:${process.env.TEST_MONGO_PORT}/${process.env.TEST_MONGO_DB_NAME}`
          : `mongodb://${process.env.TEST_MONGO_HOST}:${process.env.TEST_MONGO_PORT}/${process.env.TEST_MONGO_DB_NAME}`,
    },
  }
}
