import { Types } from 'mongoose'
import { runWithRequestContext } from '@utility/logger/context'
import { type PrivilegeGrant } from '@repository/model/privilege-grant'
import { InMemoryPrivilegeGrants } from '../testing/in-memory'
import { GrantService } from './grant.service'

describe('GrantService', () => {
  const tenantId = new Types.ObjectId().toHexString()
  const otherTenantId = new Types.ObjectId().toHexString()
  const facilityId = new Types.ObjectId().toHexString()
  const unitId = new Types.ObjectId().toHexString()
  const itemId = new Types.ObjectId().toHexString()
  let grants: InMemoryPrivilegeGrants
  let service: GrantService

  /**
   * Adds a grant.
   *
   * @param override - Fields that replace the defaults.
   * @returns The grant.
   */
  function addGrant(override: Partial<PrivilegeGrant> = {}) {
    return runWithRequestContext(
      {
        correlationId: 'c1',
        actor: { account_id: 'a1', display_name: 'Admin', kind: 'account' },
      },
      () =>
        grants.create({
          tenant_id: tenantId,
          appointment_id: new Types.ObjectId().toHexString(),
          employee_id: new Types.ObjectId().toHexString(),
          facility_ids: [facilityId],
          unit_ids: [unitId],
          catalog_item_id: itemId,
          code: 'PD-1',
          condition: 'full',
          supervisor: null,
          restriction_notes: null,
          status: 'active',
          status_change: null,
          flag: null,
          ...override,
        }),
    )
  }

  beforeEach(() => {
    grants = new InMemoryPrivilegeGrants()
    service = new GrantService(grants)
  })

  it('lists active grants by default, ordered by privilege code, and never another tenant\'s', async () => {
    const second = await addGrant({ code: 'PD-2' })
    const first = await addGrant({ code: 'PD-1' })
    await addGrant({ status: 'revoked', code: 'PD-0' })
    await addGrant({ tenant_id: otherTenantId, code: 'PD-3' })

    const found = await service.list(tenantId, { limit: 100 })

    expect(found.map((item) => item.id)).toEqual([first.id, second.id])
  })

  it('shows another status, or every status with all', async () => {
    const active = await addGrant({ code: 'PD-1' })
    const suspended = await addGrant({ code: 'PD-2', status: 'suspended' })
    const revoked = await addGrant({ code: 'PD-3', status: 'revoked' })

    expect((await service.list(tenantId, { status: 'suspended', limit: 100 })).map((item) => item.id)).toEqual([suspended.id])
    expect((await service.list(tenantId, { status: 'all', limit: 100 })).map((item) => item.id)).toEqual([active.id, suspended.id, revoked.id])
  })

  it('filters by privilege, practitioner, condition, facility, unit and open flag', async () => {
    const person = new Types.ObjectId().toHexString()
    const otherItem = new Types.ObjectId().toHexString()
    const otherFacility = new Types.ObjectId().toHexString()
    const mine = await addGrant({ employee_id: person, code: 'PD-1' })
    const restricted = await addGrant({ catalog_item_id: otherItem, condition: 'restricted', code: 'PD-2', facility_ids: [otherFacility], unit_ids: [] })
    const flagged = await addGrant({
      code: 'PD-3',
      condition: 'supervised',
      flag: { reason: 'supervisor_lost_privilege', at: new Date('2026-03-01T00:00:00Z'), resolved_at: null },
    })
    const resolved = await addGrant({
      code: 'PD-4',
      flag: { reason: 'supervisor_lost_privilege', at: new Date('2026-03-01T00:00:00Z'), resolved_at: new Date('2026-03-02T00:00:00Z') },
    })

    const ids = async (query: object) => (await service.list(tenantId, { limit: 100, ...query })).map((item) => item.id)

    expect(await ids({ employeeId: person })).toEqual([mine.id])
    expect(await ids({ catalogItemId: otherItem })).toEqual([restricted.id])
    expect(await ids({ condition: 'restricted' })).toEqual([restricted.id])
    expect(await ids({ facilityId: otherFacility })).toEqual([restricted.id])
    expect(await ids({ unitId })).toEqual([mine.id, flagged.id, resolved.id])
    expect(await ids({ flagged: true })).toEqual([flagged.id])
    expect(await ids({ flagged: false })).toEqual([mine.id, restricted.id, resolved.id])
  })

  it('pages the directory', async () => {
    for (const code of ['PD-1', 'PD-2', 'PD-3']) {
      await addGrant({ code })
    }
    expect(await service.list(tenantId, { limit: 2 })).toHaveLength(2)
    expect(await service.list(tenantId, { limit: 2, offset: 2 })).toHaveLength(1)
  })
})
