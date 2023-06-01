import { pad } from '@utility/string'
import { TimeManagement } from '@utility/time'
import * as winston from 'winston'

const lPad = {
  level: '──────────────────────────',
  timestamp: '────────────────────────────',
  content: '',
}

const today = new TimeManagement()

const sPad = {
  level: '                                  ',
  timestamp: '                          ',
  content: '',
}
const tableLength = 100
let a = 1
while (a <= tableLength) {
  lPad.content += '─'
  sPad.content += ' '
  a++
}

const lastLine = `\n└${pad(lPad.level, '', false)}┴${pad(
  lPad.timestamp,
  '',
  false
)}┴${pad(lPad.content, '', false)}──┘`

function clearLastLine() {
  process.stdout.moveCursor(0, -1)
  process.stdout.clearLine(1)
}

export const WinstonCustomTransports = {
  development: [
    new winston.transports.Console({
      level: 'verbose',
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        winston.format.printf((data) => {
          clearLastLine()
          return `│ ${pad(sPad.level, data.level, true)} │ ${pad(
            sPad.timestamp,
            data.timestamp,
            false
          )} │ ${pad(sPad.content, data.message, false)} │${lastLine}`
        })
      ),
    }),
  ] satisfies winston.transport[],
  prod: [
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
