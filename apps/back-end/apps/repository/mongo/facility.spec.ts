import { Global, Module } from '@nestjs/common'
import { getModelToken } from '@nestjs/mongoose'
import { Test } from '@nestjs/testing'
import { Types } from 'mongoose'
import { ChangeLogConfig } from '@configuration/change-log'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import {
  RepositoryConflictError,
  RepositoryError,
} from '@utility/database/error'
import { TRANSACTION_MANAGER } from '@utility/database/transaction'
import { CHANGE_OUTBOX } from '@utility/history/outbox'
import { type ChangeRecord } from '@utility/history/record'
import { runWithRequestContext } from '@utility/logger/context'
import { type FacilityRepository } from '@repository/interface/facility'
import { REPOSITORY_FACILITY } from '@repository/token'
import { FacilityRepositoryModule } from './facility.module'
import { FacilityEntity } from './schema/facility'

/**
 * Records appended to the fake outbox.
 */
const appended: ChangeRecord[] = []

/**
 * Stand-in for the global connection module: outbox, transactions and configuration.
 */
@Global()
@Module({
  providers: [
    {
      provide: CHANGE_OUTBOX,
      useValue: {
        append: async (record: ChangeRecord) => void appended.push(record),
      },
    },
    {
      provide: TRANSACTION_MANAGER,
      useValue: { run: (work: () => Promise<unknown>) => work() },
    },
    { provide: ChangeLogConfig.KEY, useValue: { recordMaxBytes: 200_000 } },
  ],
  exports: [CHANGE_OUTBOX, TRANSACTION_MANAGER, ChangeLogConfig.KEY],
})
class FakeConnectionModule {}

/**
 * Wraps a value as a Mongoose query (`.lean().exec()` and `.exec()`).
 *
 * @param value - Query result.
 * @returns The fake query.
 */
function query(value: unknown) {
  return { lean: () => ({ exec: async () => value }), exec: async () => value }
}

/**
 * Runs `work` as a signed-in request.
 *
 * @param work - Code to run.
 * @returns What `work` returns.
 */
function asAdmin<T>(work: () => Promise<T>): Promise<T> {
  return runWithRequestContext(
    {
      correlationId: 'c1',
      actor: { account_id: 'a1', display_name: 'Admin', kind: 'account' },
    },
    work,
  )
}

/**
 * Casts identifier strings to ObjectIds the way Mongoose does for ObjectId paths.
 *
 * @param document - Document being created.
 * @returns The document with ObjectId values for fields ending in `_id`.
 */
function castIds(document: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(document).map(([key, value]) => [
      key,
      key.endsWith('_id') && typeof value === 'string'
        ? new Types.ObjectId(value)
        : value,
    ]),
  )
}

const tenantId = new Types.ObjectId()
const organizationId = new Types.ObjectId()
const facilityId = new Types.ObjectId()
const actor = { account_id: 'a1', display_name: 'Admin', kind: 'account' }
const stored = {
  _id: facilityId,
  tenant_id: tenantId,
  schema_version: 1,
  version: 2,
  organization_id: organizationId,
  code: 'rs-sehat-jkt',
  name: [{ locale: 'id-ID', text: 'RS Sehat Jakarta' }],
  address: {
    use: 'work',
    lines: ['Jl. Sehat No. 1'],
    admin_levels: [{ level: 1, code: '31.74', name: 'Jakarta Selatan' }],
    city: 'Jakarta',
    subdivision: 'ID-JK',
    country: 'ID',
  },
  timezone: 'Asia/Jakarta',
  holiday_calendar_codes: ['id-national'],
  external_ids: [{ system: 'id.kemenkes-facility', value: '3174001' }],
  status: 'active',
  created_by: actor,
  created_at: new Date('2026-01-01T00:00:00Z'),
  updated_at: new Date('2026-01-01T00:00:00Z'),
  deleted_at: null,
}

describe('FacilityRepository on the shared Mongo base', () => {
  const model = {
    findOne: vi.fn(() => query(stored)),
    find: vi.fn(() => query([stored])),
    findOneAndUpdate: vi.fn(() => query({ ...stored, version: 3 })),
    create: vi.fn(async (documents: Record<string, unknown>[]) =>
      documents.map((document) => ({
        toObject: () => ({ ...stored, ...castIds(document), _id: facilityId }),
      })),
    ),
  }
  let facilities: FacilityRepository

  const input = {
    tenant_id: tenantId.toHexString(),
    organization_id: organizationId.toHexString(),
    code: 'rs-baru',
    name: [{ locale: 'en', text: 'New Hospital' }],
    address: null,
    timezone: 'Asia/Makassar',
    holiday_calendar_codes: [],
    external_ids: [],
    status: 'active' as const,
  }

  beforeEach(async () => {
    appended.length = 0
    vi.clearAllMocks()
    const moduleRef = await Test.createTestingModule({
      imports: [FakeConnectionModule, FacilityRepositoryModule],
    })
      .overrideProvider(
        getModelToken(FacilityEntity.name, MONGO_MAIN_CONNECTION),
      )
      .useValue(model)
      .compile()
    facilities = moduleRef.get(REPOSITORY_FACILITY)
  })

  it('maps a stored facility to the model, with its address, without storage fields', async () => {
    const facility = await facilities.findOne(facilityId.toHexString())

    expect(facility).toMatchObject({
      id: facilityId.toHexString(),
      tenant_id: tenantId.toHexString(),
      organization_id: organizationId.toHexString(),
      code: 'rs-sehat-jkt',
      timezone: 'Asia/Jakarta',
      address: {
        use: 'work',
        lines: ['Jl. Sehat No. 1'],
        admin_levels: [{ level: 1, code: '31.74', name: 'Jakarta Selatan' }],
        city: 'Jakarta',
        subdivision: 'ID-JK',
        country: 'ID',
      },
    })
    expect(facility?.address).not.toHaveProperty('postal_code')
    expect(JSON.stringify(facility)).not.toContain('"_id"')
    expect(JSON.stringify(facility)).not.toContain('__v')
  })

  it('maps a facility without an address to null', async () => {
    model.findOne.mockReturnValueOnce(query({ ...stored, address: null }))

    const facility = await facilities.findOne(facilityId.toHexString())

    expect(facility?.address).toBeNull()
  })

  it('finds a facility by tenant and code, and ignores a malformed tenant id', async () => {
    const found = await facilities.findByCode(
      tenantId.toHexString(),
      'rs-sehat-jkt',
    )

    expect(found?.name[0].text).toBe('RS Sehat Jakarta')
    expect(model.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'rs-sehat-jkt', deleted_at: null }),
    )
    expect(await facilities.findByCode('not-an-id', 'rs-sehat-jkt')).toBeNull()
  })

  it('finds the active facilities of an organization only', async () => {
    const found = await facilities.findActiveByOrganization(
      tenantId.toHexString(),
      organizationId.toHexString(),
    )

    expect(found).toHaveLength(1)
    expect(model.find).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active', deleted_at: null }),
    )
    expect(
      await facilities.findActiveByOrganization(tenantId.toHexString(), 'x'),
    ).toEqual([])
    expect(
      await facilities.findActiveByOrganization(
        'x',
        organizationId.toHexString(),
      ),
    ).toEqual([])
  })

  it('refuses to write without an acting account', async () => {
    await expect(facilities.create(input)).rejects.toBeInstanceOf(
      RepositoryError,
    )
    expect(model.create).not.toHaveBeenCalled()
  })

  it('stamps a created facility with the actor and records one change entry', async () => {
    await asAdmin(() => facilities.create(input))

    expect(model.create).toHaveBeenCalledWith([
      expect.objectContaining({ created_by: actor, schema_version: 1 }),
    ])
    expect(appended).toHaveLength(1)
    expect(appended[0]).toMatchObject({
      action: 'create',
      entity: { type: 'facility' },
    })
  })

  it('updates only name, address, holiday calendars, external ids and status', async () => {
    model.findOneAndUpdate.mockReturnValueOnce(
      query({
        ...stored,
        version: 3,
        name: [{ locale: 'id-ID', text: 'RS Sehat Raya' }],
      }),
    )

    await asAdmin(() =>
      facilities.update(facilityId.toHexString(), {
        name: [{ locale: 'id-ID', text: 'RS Sehat Raya' }],
        code: 'hacked',
        timezone: 'Asia/Jayapura',
        organization_id: new Types.ObjectId().toHexString(),
      } as never),
    )

    const [, update] = model.findOneAndUpdate.mock.calls[0] as unknown as [
      unknown,
      { $set: Record<string, unknown> },
    ]
    expect(update.$set).toHaveProperty('name')
    expect(update.$set).not.toHaveProperty('code')
    expect(update.$set).not.toHaveProperty('timezone')
    expect(update.$set).not.toHaveProperty('organization_id')
    expect(appended).toHaveLength(1)
    expect(appended[0]).toMatchObject({ action: 'update' })
  })

  it('clears the address when null is written', async () => {
    model.findOneAndUpdate.mockReturnValueOnce(
      query({ ...stored, version: 3, address: null }),
    )

    await asAdmin(() =>
      facilities.update(facilityId.toHexString(), { address: null }),
    )

    const [, update] = model.findOneAndUpdate.mock.calls[0] as unknown as [
      unknown,
      { $set: Record<string, unknown> },
    ]
    expect(update.$set).toHaveProperty('address', null)
  })

  it('rejects a stale expected version with a conflict', async () => {
    model.findOneAndUpdate.mockReturnValueOnce(query(null))

    await expect(
      asAdmin(() =>
        facilities.update(
          facilityId.toHexString(),
          { status: 'inactive' },
          { expectedVersion: 1 },
        ),
      ),
    ).rejects.toBeInstanceOf(RepositoryConflictError)
    expect(appended).toHaveLength(0)
  })

  it('does not support delete or soft delete', async () => {
    await expect(
      asAdmin(() => facilities.delete(facilityId.toHexString())),
    ).rejects.toBeInstanceOf(RepositoryError)
    await expect(
      asAdmin(() => facilities.deleteSoft(facilityId.toHexString())),
    ).rejects.toBeInstanceOf(RepositoryError)
  })
})
