import * as process from 'process'

export const environmentIdentifier = `${process.cwd()}/environment/.env${
  !process.env.NODE_ENV ||
  process.env.NODE_ENV === '' ||
  process.env.NODE_ENV === 'development'
    ? ''
    : `.${process.env.NODE_ENV}`
}`
