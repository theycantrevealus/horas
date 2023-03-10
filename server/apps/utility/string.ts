export function testCaption(
  title,
  type,
  caption,
  option = {
    isSkipped: false,
  }
) {
  const lPad = option.isSkipped
    ? '                    '
    : '                            '
  const typeLib = {
    data: '📦',
    ddl: '📀',
    component: '📑',
    feature: '🚀',
  }

  return (
    loggerColor('FgBrightCyan') +
    `${pad(lPad, `[${title}]`, true)} ${typeLib[type]}` +
    loggerColor('reset') +
    `- ${caption}`
  )
}

export function loggerColor(type) {
  const color = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    Dim: '\x1b[2m',
    Underscore: '\x1b[4m',
    Blink: '\x1b[5m',
    Reverse: '\x1b[7m',
    Hidden: '\x1b[8m',

    FgBlack: '\x1b[30m',
    FgRed: '\x1b[31m',
    FgGreen: '\x1b[32m',
    FgYellow: '\x1b[33m',
    FgBrightCyan: '\x1b[96m',
    FgBlue: '\x1b[34m',
    FgMagenta: '\x1b[35m',
    FgCyan: '\x1b[36m',
    FgWhite: '\x1b[37m',
    FgGray: '\x1b[90m',

    BgBlack: '\x1b[40m',
    BgRed: '\x1b[41m',
    BgGreen: '\x1b[42m',
    BgYellow: '\x1b[43m',
    BgBlue: '\x1b[44m',
    BgMagenta: '\x1b[45m',
    BgCyan: '\x1b[46m',
    BgWhite: '\x1b[47m',
    BgGray: '\x1b[100m',
  }
  return color[type]
}

export function pad(pad, str, padLeft) {
  if (typeof str === 'undefined') return pad
  if (padLeft) {
    return (pad + str).slice(-pad.length)
  } else {
    return (str + pad).substring(0, pad.length)
  }
}
