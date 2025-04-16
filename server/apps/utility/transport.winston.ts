import { environmentName } from '@utility/environtment'
import { HorasLogging } from '@utility/logger/interfaces'
import { pad } from '@utility/string'
import { TimeManagement } from '@utility/time'
import { logLevel } from 'kafkajs'
import * as process from 'process'
import * as winston from 'winston'

const lPad = {
  level: '──────────────────────────',
  timestamp: '────────────────────────────',
  content: '',
}

// const today = new TimeManagement()

export const sPad = {
  pid: '           ',
  ip: '                    ',
  method: '       ',
  level: '                        ',
  timestamp: '                          ',
  httpCode: '                  ',
  account: '                ',
  content: '',
}
const tableLength = 100
let a = 1
while (a <= tableLength) {
  lPad.content += '─'
  sPad.content += ' '
  a++
}

export const toWinstonLogLevel = (level) => {
  switch (level) {
    case logLevel.ERROR:
      return 'error'
    case logLevel.NOTHING:
      return 'error'
    case logLevel.WARN:
      return 'warn'
    case logLevel.INFO:
      return 'info'
    case logLevel.DEBUG:
      return 'debug'
  }
}

export const WinstonLogCreator = (logLevel) => {
  const logger = winston.createLogger({
    level: toWinstonLogLevel(logLevel),
    transports: WinstonCustomTransports[environmentName],
  })

  return ({ namespace, level, label, log }) => {
    const { message, ...extra } = log
    if (level === logLevel.WARN) {
      logger.warn({
        namespace: namespace,
        label: label,
        level: toWinstonLogLevel(level),
        message,
        extra,
      })
    } else if (level === logLevel.ERROR) {
      logger.error({
        namespace: namespace,
        label: label,
        level: toWinstonLogLevel(level),
        message,
        extra,
      })
    } else if (level === logLevel.NOTHING) {
      logger.error({
        namespace: namespace,
        label: label,
        level: toWinstonLogLevel(level),
        message,
        extra,
      })
    } else if (level === logLevel.INFO) {
      logger.verbose({
        namespace: namespace,
        label: label,
        level: toWinstonLogLevel(level),
        message,
        extra,
      })
    } else if (level === logLevel.DEBUG) {
      logger.debug({
        namespace: namespace,
        label: label,
        level: toWinstonLogLevel(level),
        message,
        extra,
      })
    } else {
      logger.warn({
        namespace: namespace,
        label: label,
        level: toWinstonLogLevel(level),
        message,
        extra,
      })
    }
  }
}

// const lastLine = `\n└${pad(lPad.level, '', false)}┴${pad(
//   lPad.timestamp,
//   '',
//   false
// )}┴${pad(lPad.content, '', false)}──┘`

// function clearLastLine() {
//   process.stdout.moveCursor(0, -1)
//   process.stdout.clearLine(1)
// }

function delimitter(style = '-') {
  return '\n' + style.repeat(process.stdout.columns)
}

function loggerParser(data) {
  const parsedResponseHorasLogging: HorasLogging = data.message
  const ip = pad(sPad.ip, parsedResponseHorasLogging?.ip ?? '0.0.0.0', false)
  const pid = pad(sPad.pid, process.pid, false)
  const method = pad(
    sPad.method,
    parsedResponseHorasLogging?.method ?? '-',
    false
  )

  if (parsedResponseHorasLogging?.ip) {
    const account = pad(
      sPad.account,
      `${parsedResponseHorasLogging?.account?.last_name ?? 'SYSTEM'}, ${
        parsedResponseHorasLogging?.account?.first_name ?? 'SYSTEM'
      }` ?? '-',
      false
    )
    const httpCode = pad(
      sPad.httpCode,
      `${parsedResponseHorasLogging?.result?.statusCode?.classCode ?? 'xxx'}_${
        parsedResponseHorasLogging?.result?.statusCode?.customCode ?? 'xxx'
      }` ?? '-',
      false
    )
    return `${pad(sPad.level, data.level, true)} ${pad(
      sPad.timestamp,
      data.timestamp,
      false
    )} ${ip} ${pid} ${method} ${httpCode} ${account} ${
      parsedResponseHorasLogging.result
        ? JSON.stringify(parsedResponseHorasLogging.result)
        : JSON.stringify(parsedResponseHorasLogging)
            .toString()
            .substring(0, 175)
    }... ${delimitter('┅')}`
    // return `${pad(sPad.level, data.level, true)} ${pad(
    //   sPad.timestamp,
    //   data.timestamp,
    //   false
    // )} ${ip} ${pid} ${method} ${httpCode} ${account} ${
    //   parsedResponseHorasLogging.result
    //     ? JSON.stringify(parsedResponseHorasLogging.result)
    //     : JSON.stringify(parsedResponseHorasLogging)
    // } ${delimitter('┅')}`
  } else {
    return `${pad(sPad.level, data.level, true)} ${pad(
      sPad.timestamp,
      data.timestamp,
      false
    )} ${ip} ${pid} ${method} ${pad(sPad.httpCode, '-', false)} ${pad(
      sPad.account,
      '-',
      false
    )} ${data.message}${delimitter('┅')}`
  }
}

export const WinstonCustomTransports = {
  development: [
    new winston.transports.Console({
      level: 'verbose',
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        winston.format.printf((data) => {
          return loggerParser(data)
        })
      ),
    }),
    // new winston.transports.File({
    //   filename: `logs/journal.log`,
    //   level: 'verbose',
    //   format: winston.format.combine(
    //     winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    //     winston.format.printf((data) => {
    //       const levelSet = data.level === 'verbose' ? 'info' : data.level
    //       if (typeof data.message === 'object') {
    //         const logSet = data.message
    //         const account = logSet.account
    //           ? `${logSet.account.id}-${logSet.account.last_name},${logSet.account.first_name}`
    //           : ''
    //         return `time=${data.timestamp} ip=${logSet.ip} path=${
    //           logSet.path
    //         } method=${logSet.method} taken=${
    //           logSet.takeTime
    //         } level=${levelSet} code_default=${
    //           logSet.result.code.defaultCode
    //         } code_class=${logSet.result.code.classCode} code_custom=${
    //           logSet.result.code.customCode
    //         } user=${account} payload=${JSON.stringify(logSet.payload)} msg="${
    //           logSet.result.message
    //         }"`
    //       } else {
    //         return `time=${
    //           data.timestamp
    //         } ip=0.0.0.0 path=SYS method=SYS taken=0 level=${levelSet} code_default=000 code_class=000 code_custom=00000 user=SYS payload= msg=${JSON.stringify(
    //           data.message
    //         )}`
    //       }
    //     })
    //   ),
    // }),
  ] satisfies winston.transport[],
  production: [
    new winston.transports.File({
      filename: `logs/journal.log`,
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        winston.format.printf((data) => {
          return `${data.timestamp} ${data.level} ${data.message}`
        })
      ),
    }),
  ],
  production2: [
    // new winston.transports.File({
    //   filename: `logs/${configService.get<string>(
    //     'application.log.verbose'
    //   )}/${today.getDate().toString()}.txt`,
    //   level: configService
    //     .get<string>('application.log.verbose')
    //     .toString(),
    //   format: winston.format.combine(
    //     winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    //     winston.format.printf((data) => {
    //       return JSON.stringify({
    //         timestamp: data.timestamp,
    //         level: data.level,
    //         message: data.message,
    //       })
    //     })
    //   ),
    // }),
    // new winston.transports.File({
    //   filename: `logs/${configService.get<string>(
    //     'application.log.warn'
    //   )}/${today.getDate().toString()}.txt`,
    //   level: configService
    //     .get<string>('application.log.warn')
    //     .toString(),
    //   format: winston.format.combine(
    //     winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    //     winston.format.printf((data) => {
    //       return JSON.stringify({
    //         timestamp: data.timestamp,
    //         level: data.level,
    //         message: data.message,
    //       })
    //     })
    //   ),
    // }),
    // new winston.transports.File({
    //   filename: `logs/${configService.get<string>(
    //     'application.log.error'
    //   )}/${today.getDate().toString()}.txt`,
    //   level: configService
    //     .get<string>('application.log.error')
    //     .toString(),
    //   handleExceptions: true,
    //   format: winston.format.combine(
    //     winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    //     winston.format.printf((data) => {
    //       return JSON.stringify({
    //         timestamp: data.timestamp,
    //         level: data.level,
    //         message: data.message,
    //       })
    //     })
    //   ),
    // }),
  ],
}
