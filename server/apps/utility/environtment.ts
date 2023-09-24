export const environmentIdentifier = `${process.cwd()}/environment/${
  !process.env.NODE_ENV ||
  process.env.NODE_ENV === '' ||
  process.env.NODE_ENV === 'development'
    ? ''
    : `${process.env.NODE_ENV}`
}.env`
export const environmentName =
  !process.env.NODE_ENV ||
  process.env.NODE_ENV === '' ||
  process.env.NODE_ENV === 'development'
    ? 'development'
    : `${process.env.NODE_ENV}`
