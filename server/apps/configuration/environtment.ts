export const ApplicationConfig = () => ({
  gateway_core: {
    host: process.env.GATEWAY_HOST_CORE,
    port: process.env.GATEWAY_PORT_CORE,
    host_port: process.env.GATEWAY_HOST_PORT_CORE,
  },
  gateway_inventory: {
    host: process.env.GATEWAY_HOST_INVENTORY,
    port: process.env.GATEWAY_PORT_INVENTORY,
    host_port: process.env.GATEWAY_HOST_PORT_INVENTORY,
  },
  application: {
    node_env: process.env.NODE_ENV,
    timezone: process.env.TZ,
    name: process.env.APP_NAME,
    host: process.env.APP_HOST,
    port: process.env.APP_PORT,
    host_port: process.env.APP_HOST_PORT,
    images: {
      core_dir: process.env.APP_CORE_DIR,
      core_prefix: process.env.APP_CORE_PREFIX,
    },
    jwt: 'TAKASHITANAKA0192',
    log: {
      colorize: parseInt(process.env.LOG_COLORIZE) > 0,
      info: {
        name: process.env.LOG_INFO,
        level: process.env.LOG_INFO_LEVEL,
      },
      verbose: {
        name: process.env.LOG_VERBOSE,
        level: process.env.LOG_VERBOSE_LEVEL,
      },
      warn: {
        name: process.env.LOG_WARN,
        level: process.env.LOG_WARN_LEVEL,
      },
      debug: {
        name: process.env.LOG_DEBUG,
        level: process.env.LOG_DEBUG_LEVEL,
      },
      error: {
        name: process.env.LOG_ERROR,
        level: process.env.LOG_ERROR_LEVEL,
      },
    },
    token: '',
  },
})
