import { JobsConfig, JobsSchema } from './jobs'

describe('JobsSchema', () => {
  it('accepts an empty file and applies the defaults', () => {
    const { error, value } = JobsSchema.validate({})

    expect(error).toBeUndefined()
    expect(value).toEqual({
      HR_JOBS_ENABLED: true,
      HR_JOBS_INTERVAL_MS: 3_600_000,
      HR_JOBS_BATCH_SIZE: 200,
      HR_JOBS_LEASE_SECONDS: 300,
    })
  })

  it.each([
    { HR_JOBS_INTERVAL_MS: '59999' },
    { HR_JOBS_BATCH_SIZE: '0' },
    { HR_JOBS_BATCH_SIZE: '1001' },
    { HR_JOBS_LEASE_SECONDS: '10' },
    { HR_JOBS_ENABLED: 'maybe' },
  ])('refuses %j', (input) => {
    expect(JobsSchema.validate(input).error).toBeDefined()
  })

  it('reads the values, turns the jobs off and falls back to the defaults', () => {
    process.env.HR_JOBS_BATCH_SIZE = '25'
    process.env.HR_JOBS_ENABLED = 'false'
    delete process.env.HR_JOBS_INTERVAL_MS

    expect(JobsConfig()).toMatchObject({
      enabled: false,
      batchSize: 25,
      intervalMs: 3_600_000,
    })
    delete process.env.HR_JOBS_BATCH_SIZE
    delete process.env.HR_JOBS_ENABLED
  })
})
