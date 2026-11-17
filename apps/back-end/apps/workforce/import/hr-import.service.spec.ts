import { Types } from 'mongoose'
import { RepositoryConflictError } from '@utility/database/error'
import { runWithRequestContext } from '@utility/logger/context'
import { type AppLogger } from '@utility/logger/service'
import { type HrImport } from '@repository/model/hr-import'
import { InMemoryHrImports } from '../testing/in-memory'
import { HrImportService } from './hr-import.service'

describe('HrImportService', () => {
  const tenantId = new Types.ObjectId().toHexString()
  const otherTenantId = new Types.ObjectId().toHexString()
  const log = vi.fn()
  const warn = vi.fn()
  const error = vi.fn()
  const debug = vi.fn()
  let imports: InMemoryHrImports
  let service: HrImportService

  /**
   * Runs `work` as a signed-in request.
   *
   * @param work - Code to run.
   * @returns What `work` returns.
   */
  function asAdmin<T>(work: () => Promise<T>): Promise<T> {
    return runWithRequestContext({ correlationId: 'c1', actor: { account_id: 'a1', display_name: 'Admin', kind: 'account' } }, work)
  }

  /**
   * Captures the rejection of a call.
   *
   * @param work - The call.
   * @returns The thrown error.
   */
  async function rejection(work: () => Promise<unknown>) {
    try {
      await work()
    } catch (thrown: unknown) {
      return thrown
    }
    return undefined
  }

  /**
   * Stores an import.
   *
   * @param override - Fields that replace the defaults of a validated roster import.
   * @returns The import.
   */
  function store(override: Partial<HrImport> = {}) {
    return asAdmin(() =>
      imports.create({
        tenant_id: tenantId,
        kind: 'roster_assignments',
        target: { roster_id: new Types.ObjectId().toHexString() },
        file: { file_id: 'inline:abc', content_type: 'text/csv', sha256: 'a'.repeat(64) },
        status: 'validated',
        counts: { rows: 2, valid: 2, invalid: 0, created: 2, updated: 0, skipped: 0 },
        errors: [],
        uploaded: { by: { account_id: 'a1', display_name: 'Admin', kind: 'account' }, at: new Date() },
        applied: null,
        failure: null,
        ...override,
      }),
    )
  }

  beforeEach(() => {
    vi.resetAllMocks()
    imports = new InMemoryHrImports()
    service = new HrImportService(imports, { log, warn, error, debug } as unknown as AppLogger)
  })

  describe('get', () => {
    it('returns an import of either kind, and writes no log entry', async () => {
      const roster = await store()
      const holiday = await store({ kind: 'holiday_calendar', target: { calendar_code: 'id-national', year: 2027 } })

      expect(await service.get(tenantId, roster.id)).toMatchObject({ id: roster.id, kind: 'roster_assignments' })
      expect(await service.get(tenantId, holiday.id)).toMatchObject({ id: holiday.id, kind: 'holiday_calendar' })
      expect([log, warn, error, debug].every((spy) => spy.mock.calls.length === 0)).toBe(true)
    })

    it('answers not found for a missing, malformed or foreign import', async () => {
      const foreign = await store({ tenant_id: otherTenantId })
      for (const id of [foreign.id, new Types.ObjectId().toHexString(), 'bad']) {
        expect(await rejection(() => service.get(tenantId, id))).toMatchObject({ kind: 'not_found', code: 'import_not_found' })
      }
    })
  })

  describe('cancel', () => {
    it('cancels a validated or an invalid import, keeps its record, and logs one entry without values', async () => {
      const validated = await store()
      const invalid = await store({ status: 'invalid', errors: [{ row: 2, column: 'date', code: 'invalid_date' }] })

      const first = await asAdmin(() => service.cancel(tenantId, validated.id, { reason: 'Alasan Rahasia' }))
      const second = await asAdmin(() => service.cancel(tenantId, invalid.id, {}))

      expect(first.status).toBe('cancelled')
      expect(second).toMatchObject({ status: 'cancelled', errors: [{ row: 2, column: 'date', code: 'invalid_date' }] })
      expect((await imports.findOne(validated.id))?.status).toBe('cancelled')
      expect(log.mock.calls[0]?.[0]).toMatchObject({ event: 'hr_import_cancel', outcome: 'success', status: 'cancelled' })
      expect(JSON.stringify([log.mock.calls, warn.mock.calls])).not.toContain('Alasan Rahasia')
    })

    it('cancels a holiday import too', async () => {
      const holiday = await store({ kind: 'holiday_calendar', target: { calendar_code: 'id-national', year: 2027 } })
      expect((await asAdmin(() => service.cancel(tenantId, holiday.id, {}))).status).toBe('cancelled')
    })

    it('refuses an import that was applied, cancelled or only uploaded, and changes nothing', async () => {
      for (const status of ['applied', 'cancelled', 'uploaded', 'applying', 'failed'] as const) {
        const other = await store({ status })
        expect(await rejection(() => asAdmin(() => service.cancel(tenantId, other.id, {})))).toMatchObject({ kind: 'invalid', code: 'invalid_transition' })
        expect((await imports.findOne(other.id))?.status).toBe(status)
      }
      expect(warn.mock.calls.at(-1)?.[0]).toMatchObject({ event: 'hr_import_cancel', outcome: 'failure', code: 'invalid_transition' })
    })

    it('refuses a stale version and a lost race, and answers not found for a foreign import', async () => {
      const current = await store()
      const foreign = await store({ tenant_id: otherTenantId })

      expect(await rejection(() => asAdmin(() => service.cancel(tenantId, current.id, { version: current.version + 5 })))).toMatchObject({ code: 'stale_version' })
      const spy = vi.spyOn(imports, 'update').mockRejectedValueOnce(new RepositoryConflictError('race', { operation: 'x' }))
      expect(await rejection(() => asAdmin(() => service.cancel(tenantId, current.id, {})))).toMatchObject({ code: 'stale_version' })
      spy.mockRestore()
      expect(await rejection(() => asAdmin(() => service.cancel(tenantId, foreign.id, {})))).toMatchObject({ code: 'import_not_found' })
      expect((await asAdmin(() => service.cancel(tenantId, current.id, { version: current.version }))).status).toBe('cancelled')
    })
  })
})
