import { RepositoryError } from '@utility/database/error'
import { runWithRequestContext } from '@utility/logger/context'
import { type ActorRef } from './actor'
import { type ChangeOutbox } from './outbox'
import { type ChangeRecord, type FieldClassification } from './record'
import { withChangeReason } from './reason'
import { fitRecord, OutboxChangeRecorder } from './recorder'

/**
 * Model used to exercise the recorder.
 */
interface Item {
  id: string
  tenant_id?: string
  version?: number
  deleted_at?: Date | null
  name: string
  secret_note?: string
}

const classification: FieldClassification<Item> = {
  default: 'internal',
  fields: { secret_note: 'secret' },
}

const actor: ActorRef = {
  account_id: 'a1',
  display_name: 'HR Admin',
  kind: 'account',
}

describe('OutboxChangeRecorder', () => {
  let appended: ChangeRecord[]
  let recorder: OutboxChangeRecorder

  beforeEach(() => {
    appended = []
    const outbox = {
      append: vi.fn(async (record: ChangeRecord) => {
        appended.push(record)
      }),
    } as unknown as ChangeOutbox
    const config = { recordMaxBytes: 200_000 } as never
    recorder = new OutboxChangeRecorder(outbox, config)
  })

  /**
   * Runs `work` as a signed-in request.
   *
   * @param work - Code to run.
   * @returns What `work` returns.
   */
  function asRequest<T>(work: () => Promise<T>): Promise<T> {
    return runWithRequestContext({ correlationId: 'corr-1', actor }, work)
  }

  it('rejects a write without an actor', async () => {
    await expect(
      recorder.record({
        type: 'item',
        before: null,
        after: { id: 'i1', name: 'x' },
        classification,
        operation: 'ItemRepository.create',
      }),
    ).rejects.toBeInstanceOf(RepositoryError)
    expect(appended).toHaveLength(0)
  })

  it('stores a create with actor, reason, correlation and tenant from context and entity', async () => {
    const record = await asRequest(() =>
      withChangeReason('Imported from the HR file', () =>
        recorder.record({
          type: 'item',
          before: null,
          after: { id: 'i1', tenant_id: 't1', version: 1, name: 'x' },
          classification,
          operation: 'ItemRepository.create',
        }),
      ),
    )
    expect(record).toMatchObject({
      event: 'data_change',
      schema_version: 1,
      tenant_id: 't1',
      entity: { type: 'item', id: 'i1', version: 1 },
      action: 'create',
      actor,
      reason: 'Imported from the HR file',
      operation: 'ItemRepository.create',
      correlation_id: 'corr-1',
      data_class: 'internal',
      changes: [{ path: 'name', class: 'internal', before: null, after: 'x' }],
    })
    expect(record?.change_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
    expect(appended).toEqual([record])
  })

  it('stores nothing for an update that changes nothing', async () => {
    const item = { id: 'i1', name: 'x' }
    const record = await asRequest(() =>
      recorder.record({
        type: 'item',
        before: item,
        after: { ...item },
        classification,
        operation: 'op',
      }),
    )
    expect(record).toBeNull()
    expect(appended).toHaveLength(0)
  })

  it('derives soft delete and restore, and uses the platform tenant without tenant_id', async () => {
    const active: Item = { id: 'i1', name: 'x', deleted_at: null }
    const deleted: Item = { ...active, deleted_at: new Date() }
    const softDelete = await asRequest(() =>
      recorder.record({
        type: 'item',
        before: active,
        after: deleted,
        classification,
        operation: 'op',
      }),
    )
    const restore = await asRequest(() =>
      recorder.record({
        type: 'item',
        before: deleted,
        after: active,
        classification,
        operation: 'op',
      }),
    )
    expect(softDelete).toMatchObject({
      action: 'soft_delete',
      tenant_id: 'platform',
      changes: [],
    })
    expect(restore).toMatchObject({ action: 'restore' })
  })

  it('records a delete without fields and with the model default class', async () => {
    const record = await asRequest(() =>
      recorder.record({
        type: 'item',
        before: { id: 'i1', name: 'x' },
        after: null,
        classification,
        operation: 'op',
      }),
    )
    expect(record).toMatchObject({
      action: 'delete',
      changes: [],
      data_class: 'internal',
    })
  })

  it('uses the highest class of the changed fields', async () => {
    const record = await asRequest(() =>
      recorder.record({
        type: 'item',
        before: { id: 'i1', name: 'x' },
        after: { id: 'i1', name: 'y', secret_note: 's' },
        classification,
        operation: 'op',
      }),
    )
    expect(record?.data_class).toBe('secret')
    expect(JSON.stringify(record)).not.toContain('"s"')
  })

  it('records reads of highly confidential records', async () => {
    const record = await asRequest(() =>
      recorder.recordAccess({
        type: 'discipline_case',
        id: 'd1',
        operation: 'DisciplineService.getCase',
        tenantId: 't1',
      }),
    )
    expect(record).toMatchObject({
      action: 'read',
      changes: [],
      data_class: 'highly_confidential',
      entity: { type: 'discipline_case', id: 'd1', version: null },
    })
  })
})

describe('fitRecord', () => {
  it('drops the largest values first, keeps every path and marks the record truncated', () => {
    const record = {
      event: 'data_change',
      changes: [
        { path: 'small', class: 'internal', before: null, after: 'x' },
        {
          path: 'large',
          class: 'internal',
          before: null,
          after: 'y'.repeat(5000),
        },
      ],
    } as unknown as ChangeRecord
    const fitted = fitRecord(record, 1000)
    expect(fitted.truncated).toBe(true)
    expect(fitted.changes).toEqual([
      { path: 'small', class: 'internal', before: null, after: 'x' },
      {
        path: 'large',
        class: 'internal',
        before: null,
        after: { masked: 'changed' },
      },
    ])
    expect(record.changes[1].after).not.toEqual({ masked: 'changed' })
  })

  it('leaves records under the limit unchanged', () => {
    const record = {
      event: 'data_change',
      changes: [],
    } as unknown as ChangeRecord
    expect(fitRecord(record, 1000)).toBe(record)
  })
})
