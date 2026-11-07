import { ChangeLogSchema } from './change-log'

describe('ChangeLogSchema', () => {
  it('rejects a configuration without any output', () => {
    const { error } = ChangeLogSchema.validate({
      CHANGE_LOG_STDOUT: 'false',
      CHANGE_LOG_FILE_DIR: '',
    })
    expect(error?.message).toContain('the change log needs an output')
  })

  it('accepts a file directory or stdout, and applies defaults', () => {
    const { error, value } = ChangeLogSchema.validate({
      CHANGE_LOG_FILE_DIR: 'logs/change',
    })
    expect(error).toBeUndefined()
    expect(value).toMatchObject({
      CHANGE_LOG_HASH_CHAIN: true,
      CHANGE_OUTBOX_KEEP_DAYS: 7,
      CHANGE_RECORD_MAX_BYTES: 200_000,
    })
    expect(
      ChangeLogSchema.validate({ CHANGE_LOG_STDOUT: 'true' }).error,
    ).toBeUndefined()
  })
})
