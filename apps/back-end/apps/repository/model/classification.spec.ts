import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * Model files that are not stored records, so they need no classification: the timestamp base class
 * and the event contract of the workforce context (events are not business data).
 */
const NOT_RECORDS = new Set(['timestamp.ts', 'workforce-event.ts'])

describe('field classifications', () => {
  it('exist for every model, so no collection can skip the change history (database.md 6.1)', async () => {
    const files = await readdir(__dirname)
    const models = files.filter(
      (file) =>
        file.endsWith('.ts') &&
        !file.endsWith('.classification.ts') &&
        !file.endsWith('.spec.ts') &&
        !NOT_RECORDS.has(file),
    )
    const missing = models.filter(
      (model) => !files.includes(model.replace(/\.ts$/, '.classification.ts')),
    )
    expect(models.length).toBeGreaterThan(0)
    expect(missing).toEqual([])
  })

  it('declare a valid default class', async () => {
    const files = (await readdir(__dirname)).filter((file) =>
      file.endsWith('.classification.ts'),
    )
    for (const file of files) {
      const exported: Record<string, unknown> = await import(
        join(__dirname, file)
      )
      const values = Object.values(exported)
      expect(values.length).toBeGreaterThan(0)
      for (const value of values) {
        expect(value).toHaveProperty('default')
      }
    }
  })
})
