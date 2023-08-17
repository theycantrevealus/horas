import * as winston from 'winston'

export const initLogger = (appname) => {
  //// Here we use winston.containers IoC
  winston.loggers.add('default', {
    level: 'info',
    ///// Adding ISO levels of logging from PINO
    levels: Object.assign(
      { fatal: 0, warn: 4, trace: 7 },
      winston.config.syslog.levels
    ),
    format: winston.format.combine(
      winston.format.splat(),
      winston.format.json()
    ),
    defaultMeta: {
      service: appname + '_' + (process.env.NODE_ENV || 'development'),
    },
    transports: [
      //// Your custom transport
    ],
  })

  //// Here we use winston.containers IoC get accessor
  const logger = winston.loggers.get('default')

  if (process.env.NODE_ENV !== 'production') {
    logger.add(
      new winston.transports.Console({
        format: winston.format.simple(),
        handleExceptions: true,
      })
    )
  }

  process.on('uncaughtException', function (err) {
    console.log('UncaughtException processing: %s', err)
  })

  //// PINO like, we link winston.containers to use only one instance of logger
  logger.child = function () {
    return winston.loggers.get('default')
  }

  return logger
}
