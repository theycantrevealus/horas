export function testCaption(
  title,
  type,
  caption,
  option = {
    tab: 0,
  }
) {
  const lPadLib = [
    '                                         ',
    '                                             ',
    '                                                 ',
  ]
  const lPad = lPadLib[option.tab]
  const typeLib = {
    data: '📦',
    ddl: '📀',
    component: '📑',
    feature: '🚀',
  }

  return (
    loggerColor('FgBrightCyan') +
    `${pad(lPad, `[${title}]`, true)} ${typeLib[type]} ` +
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

export function checkBin(n) {
  return /^[01]{1,64}$/.test(n)
}
export function checkDec(n) {
  return /^[0-9]{1,64}$/.test(n)
}
export function checkHex(n) {
  return /^[0-9A-Fa-f]{1,64}$/.test(n)
}
export function unpad(s) {
  s = '' + s
  return s.replace(/^0+/, '')
}

// === DECIMAL OPEARTIONS
export function Dec2Bin(n) {
  if (!checkDec(n) || n < 0) return 0
  return n.toString(2)
}
export function Dec2Hex(n) {
  if (!checkDec(n) || n < 0) return 0
  return n.toString(16)
}

// === BINARY OPERATIONS
export function Bin2Dec(n) {
  if (!checkBin(n)) return 0
  return parseInt(n, 2).toString(10)
}
export function Bin2Hex(n) {
  if (!checkBin(n)) return 0
  return parseInt(n, 2).toString(16)
}

// === HEXADECIMAL OPEARTIONS
export function Hex2Bin(n) {
  const length = n.length / 2
  const result = new Uint8Array(length)
  for (let i = 0; i < length; ++i) {
    result[i] = parseInt(n.slice(i * 2, i * 2 + 2), 16)
  }
  return result
}
export function Hex2Dec(n) {
  if (!checkHex(n)) return 0
  return parseInt(n, 16).toString(10)
}
