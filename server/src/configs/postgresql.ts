export default () => ({
  mode: process.env.MODE,
  development: {
    host: process.env.DB_DEV_HOST,
    port: parseInt(process.env.DB_DEV_PORT),
    username: process.env.DB_DEV_USERNAME,
    password: process.env.DB_DEV_PASSWORD,
    database: process.env.DB_DEV_NAME,
    logging: process.env.DB_DEV_LOGGING,
  },
  pre_production: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    logging: process.env.DB_LOGGING,
  },
  production: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    logging: process.env.DB_LOGGING,
  },
})
