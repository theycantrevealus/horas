import { Types } from 'mongoose'
import { runWithRequestContext } from '@utility/logger/context'
import { type OrganizationUnit } from '@repository/model/organization-unit'
import {
  InMemoryOrganizationUnits,
  InMemoryPositionAssignments,
  InMemoryPositions,
} from '../testing/in-memory'
import { LeaveDeciderService } from './decider'

describe('LeaveDeciderService', () => {
  const tenantId = new Types.ObjectId().toHexString()
  const otherTenantId = new Types.ObjectId().toHexString()
  const organizationId = new Types.ObjectId().toHexString()
  const facilityId = new Types.ObjectId().toHexString()
  const actor = { account_id: 'a1', display_name: 'Admin', kind: 'account' as const }
  let units: InMemoryOrganizationUnits
  let positions: InMemoryPositions
  let assignments: InMemoryPositionAssignments
  let service: LeaveDeciderService

  /**
   * Runs `work` as a seed request.
   *
   * @param work - Code to run.
   * @returns What `work` returns.
   */
  function seed<T>(work: () => Promise<T>): Promise<T> {
    return runWithRequestContext({ correlationId: 'seed', actor }, work)
  }

  /**
   * Adds a unit.
   *
   * @param parent - Its parent unit, or `null`.
   * @returns The unit.
   */
  function addUnit(parent: OrganizationUnit | null = null): Promise<OrganizationUnit> {
    return seed(() =>
      units.create({
        tenant_id: tenantId, organization_id: organizationId, facility_id: facilityId, code: `u-${new Types.ObjectId().toHexString()}`,
        name: [{ locale: 'en', text: 'Ward' }], type: { system: 'id.unit-type', code: 'ward' }, parent_id: parent?.id ?? null,
        ancestor_ids: parent ? [...parent.ancestor_ids, parent.id] : [], is_clinical: true, external_ids: [], period: { start: '2026-01-01', end: null }, status: 'active',
      }),
    )
  }

  /**
   * Makes an employee the Head of a unit: a head position and an assignment to it.
   *
   * @param unit - The unit.
   * @param status - Status of the assignment.
   * @param tenant - Tenant of the records.
   * @returns The Head's employee identifier.
   */
  async function appointHead(unit: OrganizationUnit, status: 'active' | 'planned' | 'ended' = 'active', tenant = tenantId): Promise<string> {
    const position =
      (await positions.findActiveHead(tenant, unit.id)) ??
      (await seed(() =>
        positions.create({
          tenant_id: tenant, unit_id: unit.id, code: `p-${new Types.ObjectId().toHexString()}`, title: [{ locale: 'en', text: 'Head' }], kind: 'structural',
          is_head_of_unit: true, allowed_professions: [], grade: null, budgeted_headcount: 1, job_description: null, period: null, status: 'active',
        }),
      ))
    const employeeId = new Types.ObjectId().toHexString()
    await seed(() =>
      assignments.create({
        tenant_id: tenant, employee_id: employeeId, contract_id: new Types.ObjectId().toHexString(), position_id: position.id, unit_id: unit.id, facility_id: facilityId,
        is_primary: true, is_head_of_unit: true, kind: { system: 'id.assignment-kind', code: 'hire' }, period: { start: '2026-01-01', end: null }, fte: 1,
        status, is_open: status !== 'ended', decision_ref: null,
      }),
    )
    return employeeId
  }

  beforeEach(() => {
    units = new InMemoryOrganizationUnits()
    positions = new InMemoryPositions()
    assignments = new InMemoryPositionAssignments()
    service = new LeaveDeciderService(positions, assignments)
  })

  describe('chooseFirst', () => {
    it('is the Head of the requester\'s own unit', async () => {
      const unit = await addUnit()
      await appointHead(unit)

      expect(await service.chooseFirst(tenantId, new Types.ObjectId().toHexString(), unit)).toEqual({ kind: 'unit_head', unit_id: unit.id, employee_id: null })
    })

    it('is the Head of the parent unit when the requester is the Head of their own unit', async () => {
      const parent = await addUnit()
      await appointHead(parent)
      const unit = await addUnit(parent)
      const head = await appointHead(unit)

      expect(await service.chooseFirst(tenantId, head, unit)).toEqual({ kind: 'parent_head', unit_id: parent.id, employee_id: null })
    })

    it('is the Head of the parent unit when the unit has no Head, or only a planned or ended one', async () => {
      const parent = await addUnit()
      await appointHead(parent)
      const bare = await addUnit(parent)
      const planned = await addUnit(parent)
      await appointHead(planned, 'planned')
      const ended = await addUnit(parent)
      await appointHead(ended, 'ended')

      for (const unit of [bare, planned, ended]) {
        expect(await service.chooseFirst(tenantId, new Types.ObjectId().toHexString(), unit)).toEqual({ kind: 'parent_head', unit_id: parent.id, employee_id: null })
      }
    })

    it('is HR Manager when the parent has no Head either, there is no parent, or the requester heads both', async () => {
      const parent = await addUnit()
      const noHeadAbove = await addUnit(parent)
      const root = await addUnit()
      const grandParent = await addUnit()
      const both = await addUnit(grandParent)
      const head = await appointHead(both)
      // The same person also heads the parent unit.
      const parentPosition = await seed(() =>
        positions.create({ tenant_id: tenantId, unit_id: grandParent.id, code: 'p-parent', title: [{ locale: 'en', text: 'Head' }], kind: 'structural', is_head_of_unit: true, allowed_professions: [], grade: null, budgeted_headcount: 1, job_description: null, period: null, status: 'active' }),
      )
      await seed(() =>
        assignments.create({ tenant_id: tenantId, employee_id: head, contract_id: new Types.ObjectId().toHexString(), position_id: parentPosition.id, unit_id: grandParent.id, facility_id: facilityId, is_primary: false, is_head_of_unit: true, kind: { system: 'id.assignment-kind', code: 'acting' }, period: { start: '2026-01-01', end: null }, fte: 0, status: 'active', is_open: true, decision_ref: null }),
      )
      const requester = new Types.ObjectId().toHexString()

      expect(await service.chooseFirst(tenantId, requester, noHeadAbove)).toEqual({ kind: 'hr_manager', unit_id: null, employee_id: null })
      expect(await service.chooseFirst(tenantId, requester, root)).toEqual({ kind: 'hr_manager', unit_id: null, employee_id: null })
      expect(await service.chooseFirst(tenantId, head, both)).toEqual({ kind: 'hr_manager', unit_id: null, employee_id: null })
    })

    it('is HR Manager for a requester with no unit, and ignores another tenant\'s Head', async () => {
      expect(await service.chooseFirst(tenantId, new Types.ObjectId().toHexString(), null)).toEqual({ kind: 'hr_manager', unit_id: null, employee_id: null })
      const unit = await addUnit()
      await appointHead(unit, 'active', otherTenantId)

      expect((await service.chooseFirst(tenantId, new Types.ObjectId().toHexString(), unit)).kind).toBe('hr_manager')
    })
  })

  describe('resolve', () => {
    it('finds the current Head of the stored unit, even one appointed after the request was made', async () => {
      const unit = await addUnit()
      const former = await appointHead(unit)
      const decider = await service.chooseFirst(tenantId, new Types.ObjectId().toHexString(), unit)
      expect(await service.resolve(tenantId, decider)).toEqual({ kind: 'unit_head', employeeId: former })

      const [position] = await positions.findAll({ where: { unit_id: { eq: unit.id } } })
      const [assignment] = await assignments.findOpenByPosition(tenantId, position!.id)
      await seed(() => assignments.update(assignment!.id, { status: 'ended', is_open: false }))
      const appointed = await appointHead(unit)

      expect(await service.resolve(tenantId, decider)).toEqual({ kind: 'unit_head', employeeId: appointed })
    })

    it('falls to HR Manager when the unit has no Head any more, and for a decider that is HR Manager', async () => {
      const unit = await addUnit()
      const decider = { kind: 'unit_head' as const, unit_id: unit.id, employee_id: null }

      expect(await service.resolve(tenantId, decider)).toEqual({ kind: 'hr_manager', employeeId: null })
      expect(await service.resolve(tenantId, { kind: 'hr_manager', unit_id: null, employee_id: null })).toEqual({ kind: 'hr_manager', employeeId: null })
    })
  })

  describe('headedUnits', () => {
    it('lists the units whose active Head an employee is', async () => {
      const first = await addUnit()
      const second = await addUnit()
      const head = await appointHead(first)
      const planned = await appointHead(second, 'planned')

      expect(await service.headedUnits(tenantId, head)).toEqual([first.id])
      expect(await service.headedUnits(tenantId, planned)).toEqual([])
      expect(await service.headedUnits(tenantId, new Types.ObjectId().toHexString())).toEqual([])
    })
  })
})
