export const ApplicationConfig = () => ({
  application: {
    name: process.env.APP_NAME,
    host: process.env.APP_HOST,
    port: process.env.APP_PORT,
    hostport: process.env.APP_HOST_PORT,
    node_env: process.env.NODE_ENV,
    timezone: parseInt(process.env.TIMEZONE) * 60 * 60 * 1000,
    jwt: 'TAKASHITANAKA0192',
    token: '',
  },
})
