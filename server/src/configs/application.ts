export default () => ({
  application: {
    name: process.env.APP_NAME,
    host: process.env.APP_HOST,
    port: process.env.APP_PORT,
    jwt: process.env.JWT_SECRET,
  },
  sentry: {
    dsn: process.env.SENTRY_DSN,
  },
})
