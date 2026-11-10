/**
 * Format of the codes people use to refer to HR records (organizations, facilities, units):
 * lower case letters, digits, dots, hyphens and underscores, starting with a letter or digit,
 * 2 to 32 characters. Lower case only, so uniqueness needs no case rules.
 */
export const CODE_PATTERN = /^[a-z0-9][a-z0-9._-]{1,31}$/

/**
 * Public message for a code that breaks `CODE_PATTERN`.
 */
export const CODE_MESSAGE =
  'The code must have 2 to 32 lower-case letters, digits, dots, hyphens or underscores.'
