import { Types } from 'mongoose'
import { runWithRequestContext } from '@utility/logger/context'
import { type AppLogger } from '@utility/logger/service'
import { type CredentialApplication } from '@repository/model/credential-application'
import { CodeConceptService } from '../concept/code-concept.service'
import {
  InMemoryCodeConcepts,
  InMemoryCommitteeMemberships,
  InMemoryCredentialApplications,
  InMemoryEmployees,
} from '../testing/in-memory'
import { ReviewService } from './review.service'

describe('ReviewService', () => {
  const tenantId = new Types.ObjectId().toHexString()
  const otherTenantId = new Types.ObjectId().toHexString()
  const log = vi.fn()
  const warn = vi.fn()
  const error = vi.fn()
  const debug = vi.fn()
  let applications: InMemoryCredentialApplications
  let employees: InMemoryEmployees
  let memberships: InMemoryCommitteeMemberships
  let concepts: InMemoryCodeConcepts
  let service: ReviewService
  let facilityId: string
  let applicantId: string
  let chairId: string

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
   * Adds a code concept.
   *
   * @param system - Code system.
   * @param code - Code.
   */
  async function addConcept(system: string, code: string) {
    await asAdmin(() =>
      concepts.create({
        system,
        code,
        display: [{ locale: 'en', text: code }],
        properties: {},
        mappings: [],
        period: null,
        status: 'active',
      }),
    )
  }

  /**
   * Adds an employee.
   *
   * @param status - Employment status.
   * @param tenant - Tenant of the employee.
   * @returns The employee identifier.
   */
  async function addEmployee(
    status: 'active' | 'separated' = 'active',
    tenant = tenantId,
  ): Promise<string> {
    const employee = await asAdmin(() =>
      employees.create({
        tenant_id: tenant,
        employee_number: `E${new Types.ObjectId().toHexString()}`,
        name: { use: 'official', text: 'Siti', given: [], prefix: [], suffix: [] },
        other_names: [],
        display_name: 'Siti',
        administrative_gender: null,
        workforce_category: { system: 'id.workforce-category', code: 'tenaga_medis' },
        is_clinical: true,
        profession: { system: 'id.profession', code: 'dokter' },
        specialties: [],
        clinical_level: null,
        employment_status: status,
        employment_status_since: '2026-01-01',
        current_employment: null,
        primary_assignment: null,
        original_hire_date: '2026-01-01',
        separation_date: null,
        practitioner_ids: [],
        work_contacts: [],
        photo: null,
        preferred_language: null,
      }),
    )
    return employee.id
  }

  /**
   * Seats an employee on a committee.
   *
   * @param employeeId - The member.
   * @param role - Role code.
   * @param override - Facility, committee and status that replace the defaults.
   */
  async function seat(
    employeeId: string,
    role: string,
    override: {
      facility?: string
      committee?: string
      status?: 'active' | 'ended'
    } = {},
  ) {
    await asAdmin(() =>
      memberships.create({
        tenant_id: tenantId,
        employee_id: employeeId,
        facility_id: override.facility ?? facilityId,
        committee: {
          system: 'id.committee',
          code: override.committee ?? 'komite_medik',
        },
        role: { system: 'id.committee-role', code: role },
        period: { start: '2026-01-01', end: null },
        decision_ref: null,
        status: override.status ?? 'active',
      }),
    )
  }

  /**
   * Stores an application in a given status.
   *
   * @param status - Status of the application.
   * @param override - Fields that replace the defaults.
   * @returns The application.
   */
  function stored(
    status: CredentialApplication['status'],
    override: Partial<CredentialApplication> = {},
  ) {
    return asAdmin(() =>
      applications.create({
        tenant_id: tenantId,
        employee_id: applicantId,
        credentialing_facility_id: facilityId,
        credentialing_scope: 'facility',
        type: 'initial',
        committee: { system: 'id.committee', code: 'komite_medik' },
        status,
        status_since: new Date('2026-03-01T00:00:00Z'),
        requested_privileges: [],
        requested_unit_ids: [],
        requested_facility_ids: [facilityId],
        documents: [],
        assessors: [],
        recommendation: null,
        decision: null,
        return_reason: null,
        withdrawal_reason: null,
        temporary: null,
        previous_appointment_id: null,
        ...override,
      }),
    )
  }

  /**
   * Builds an appointed assessor record.
   *
   * @param employeeId - The assessor.
   * @param conflict - Declaration, or `null` when none was made.
   * @returns The assessor entry.
   */
  function assessor(
    employeeId: string,
    conflict: CredentialApplication['assessors'][number]['conflict_declaration'] = null,
  ): CredentialApplication['assessors'][number] {
    return {
      employee_id: employeeId,
      appointed_at: new Date('2026-03-02T00:00:00Z'),
      appointed_by: { account_id: 'a1', display_name: 'Admin', kind: 'account' },
      conflict_declaration: conflict,
    }
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
    throw new Error('Expected a rejection')
  }

  beforeEach(async () => {
    vi.resetAllMocks()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-03-10T12:00:00Z'))
    applications = new InMemoryCredentialApplications()
    employees = new InMemoryEmployees()
    memberships = new InMemoryCommitteeMemberships()
    concepts = new InMemoryCodeConcepts()
    const logger = { log, warn, error, debug } as unknown as AppLogger
    service = new ReviewService(
      applications,
      employees,
      memberships,
      new CodeConceptService(concepts, logger),
      logger,
    )
    await addConcept('id.conflict-relationship', 'relative')
    await addConcept('id.conflict-relationship', 'supervisor')
    await addConcept('id.evidence-type', 'certificate')
    facilityId = new Types.ObjectId().toHexString()
    applicantId = await addEmployee()
    chairId = await addEmployee()
    await seat(chairId, 'chair')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('committee access (every committee route)', () => {
    it('refuses a caller who is not signed in as an employee, a stranger and members of other places', async () => {
      const application = await stored('submitted')
      const stranger = await addEmployee()
      const otherFacility = await addEmployee()
      await seat(otherFacility, 'member', { facility: new Types.ObjectId().toHexString() })
      const otherCommittee = await addEmployee()
      await seat(otherCommittee, 'member', { committee: 'komite_keperawatan' })
      const ended = await addEmployee()
      await seat(ended, 'member', { status: 'ended' })

      for (const caller of [null, stranger, otherFacility, otherCommittee, ended]) {
        expect(
          await rejection(() => asAdmin(() => service.startReview(tenantId, caller, application.id, {}))),
        ).toMatchObject({ kind: 'forbidden', code: 'not_committee_member' })
      }
      expect((await applications.findOne(application.id))?.status).toBe('submitted')
    })

    it('answers 404 for a missing, malformed or foreign application before any membership check', async () => {
      const foreign = await stored('submitted', { tenant_id: otherTenantId })
      for (const id of [new Types.ObjectId().toHexString(), 'bad', foreign.id]) {
        expect(
          await rejection(() => asAdmin(() => service.startReview(tenantId, chairId, id, {}))),
        ).toMatchObject({ kind: 'not_found', code: 'application_not_found' })
      }
    })
  })

  describe('startReview', () => {
    it('moves a submitted application to under_review for any active member and logs no values', async () => {
      const member = await addEmployee()
      await seat(member, 'member')
      const application = await stored('submitted')

      const updated = await asAdmin(() =>
        service.startReview(tenantId, member, application.id, { reason: 'Alasan Rahasia' }),
      )

      expect(updated.status).toBe('under_review')
      expect(updated.status_since).toEqual(new Date('2026-03-10T12:00:00Z'))
      expect(log).toHaveBeenCalledTimes(1)
      expect(log.mock.calls[0]?.[0]).toMatchObject({
        event: 'application_start_review',
        outcome: 'success',
      })
      expect(JSON.stringify(log.mock.calls)).not.toContain('Alasan Rahasia')
    })

    it('refuses every status but submitted', async () => {
      for (const status of ['draft', 'under_review', 'returned', 'assessed', 'recommended', 'withdrawn'] as const) {
        const application = await stored(status)
        expect(
          await rejection(() => asAdmin(() => service.startReview(tenantId, chairId, application.id, {}))),
        ).toMatchObject({ kind: 'invalid', code: 'invalid_transition' })
      }
    })

    it('answers 409 for a stale version and writes nothing', async () => {
      const application = await stored('submitted')
      expect(
        await rejection(() =>
          asAdmin(() => service.startReview(tenantId, chairId, application.id, { version: application.version + 1 })),
        ),
      ).toMatchObject({ kind: 'conflict', code: 'stale_version' })
      expect((await applications.findOne(application.id))?.status).toBe('submitted')
    })
  })

  describe('returnApplication', () => {
    it('returns an application under review or assessed with the reason stored', async () => {
      for (const status of ['under_review', 'assessed'] as const) {
        const application = await stored(status)
        const updated = await asAdmin(() =>
          service.returnApplication(tenantId, chairId, application.id, { reason: '  STR belum ada  ' }),
        )
        expect(updated).toMatchObject({ status: 'returned', return_reason: 'STR belum ada' })
        expect(updated.status_since).toEqual(new Date('2026-03-10T12:00:00Z'))
      }
      expect(JSON.stringify(log.mock.calls)).not.toContain('STR belum ada')
      expect(log.mock.calls[0]?.[0]).toMatchObject({ event: 'application_return', outcome: 'success' })
    })

    it('needs a reason of 1 to 500 characters', async () => {
      const application = await stored('under_review')
      expect(
        await rejection(() => asAdmin(() => service.returnApplication(tenantId, chairId, application.id, { reason: '  ' }))),
      ).toMatchObject({ code: 'reason_required' })
      expect(
        await rejection(() =>
          asAdmin(() => service.returnApplication(tenantId, chairId, application.id, { reason: 'x'.repeat(501) })),
        ),
      ).toMatchObject({ code: 'invalid_reason' })
    })

    it('refuses every status but under_review and assessed', async () => {
      for (const status of ['draft', 'submitted', 'returned', 'recommended', 'withdrawn'] as const) {
        const application = await stored(status)
        expect(
          await rejection(() => asAdmin(() => service.returnApplication(tenantId, chairId, application.id, { reason: 'x' }))),
        ).toMatchObject({ code: 'invalid_transition' })
      }
    })

    it('answers 409 for a stale version', async () => {
      const application = await stored('under_review')
      expect(
        await rejection(() =>
          asAdmin(() => service.returnApplication(tenantId, chairId, application.id, { reason: 'x', version: 99 })),
        ),
      ).toMatchObject({ code: 'stale_version' })
    })
  })

  describe('appointAssessors', () => {
    it('appoints eligible mitra bestari, records who and when, and adds to the ones already appointed', async () => {
      const first = await addEmployee()
      const second = await addEmployee()
      await seat(first, 'mitra_bestari')
      await seat(second, 'mitra_bestari')
      const application = await stored('under_review')

      const one = await asAdmin(() =>
        service.appointAssessors(tenantId, chairId, application.id, { assessorEmployeeIds: [first] }),
      )
      const two = await asAdmin(() =>
        service.appointAssessors(tenantId, chairId, application.id, { assessorEmployeeIds: [second] }),
      )

      expect(one.assessors).toHaveLength(1)
      expect(two.assessors.map((entry) => entry.employee_id)).toEqual([first, second])
      expect(two.assessors[0]).toMatchObject({
        employee_id: first,
        appointed_at: new Date('2026-03-10T12:00:00Z'),
        appointed_by: { account_id: 'a1', display_name: 'Admin', kind: 'account' },
        conflict_declaration: null,
      })
      expect(log.mock.calls[0]?.[0]).toMatchObject({ event: 'application_appoint_assessors', outcome: 'success' })
    })

    it('refuses the applicant, a plain member, a person of another committee, an ended seat, a separated, a foreign and a missing employee', async () => {
      const application = await stored('under_review')
      const plain = await addEmployee()
      await seat(plain, 'member')
      const otherCommittee = await addEmployee()
      await seat(otherCommittee, 'mitra_bestari', { committee: 'komite_keperawatan' })
      const ended = await addEmployee()
      await seat(ended, 'mitra_bestari', { status: 'ended' })
      const separated = await addEmployee('separated')
      await seat(separated, 'mitra_bestari')
      const foreign = await addEmployee('active', otherTenantId)
      await seat(applicantId, 'mitra_bestari')

      for (const id of [applicantId, plain, otherCommittee, ended, separated, foreign, new Types.ObjectId().toHexString(), 'bad']) {
        expect(
          await rejection(() =>
            asAdmin(() => service.appointAssessors(tenantId, chairId, application.id, { assessorEmployeeIds: [id] })),
          ),
        ).toMatchObject({ kind: 'invalid', code: 'assessor_not_eligible' })
      }
      expect((await applications.findOne(application.id))?.assessors).toEqual([])
    })

    it('appoints all or none', async () => {
      const good = await addEmployee()
      await seat(good, 'mitra_bestari')
      const application = await stored('under_review')

      await rejection(() =>
        asAdmin(() => service.appointAssessors(tenantId, chairId, application.id, { assessorEmployeeIds: [good, applicantId] })),
      )

      expect((await applications.findOne(application.id))?.assessors).toEqual([])
    })

    it('answers 409 for an assessor who is already appointed', async () => {
      const good = await addEmployee()
      await seat(good, 'mitra_bestari')
      const application = await stored('under_review', { assessors: [assessor(good)] })

      expect(
        await rejection(() =>
          asAdmin(() => service.appointAssessors(tenantId, chairId, application.id, { assessorEmployeeIds: [good] })),
        ),
      ).toMatchObject({ kind: 'conflict', code: 'assessor_already_appointed' })
    })

    it('needs 1 to 20 different identifiers', async () => {
      const application = await stored('under_review')
      const good = await addEmployee()
      await seat(good, 'mitra_bestari')
      const many = Array.from({ length: 21 }, () => new Types.ObjectId().toHexString())

      for (const ids of [[], [good, good], many]) {
        expect(
          await rejection(() =>
            asAdmin(() => service.appointAssessors(tenantId, chairId, application.id, { assessorEmployeeIds: ids })),
          ),
        ).toMatchObject({ code: 'invalid_assessors' })
      }
    })

    it('works only while under review, and not for a temporary application', async () => {
      const good = await addEmployee()
      await seat(good, 'mitra_bestari')
      for (const status of ['draft', 'submitted', 'returned', 'assessed', 'recommended', 'withdrawn'] as const) {
        const application = await stored(status)
        expect(
          await rejection(() =>
            asAdmin(() => service.appointAssessors(tenantId, chairId, application.id, { assessorEmployeeIds: [good] })),
          ),
        ).toMatchObject({ code: 'invalid_transition' })
      }
      const temporary = await stored('under_review', {
        type: 'temporary',
        temporary: { requested_days: 10, urgency: { system: 'id.temporary-urgency', code: 'disaster' } },
      })
      expect(
        await rejection(() =>
          asAdmin(() => service.appointAssessors(tenantId, chairId, temporary.id, { assessorEmployeeIds: [good] })),
        ),
      ).toMatchObject({ code: 'assessment_not_required' })
    })

    it('answers 409 for a stale version', async () => {
      const good = await addEmployee()
      await seat(good, 'mitra_bestari')
      const application = await stored('under_review')
      expect(
        await rejection(() =>
          asAdmin(() =>
            service.appointAssessors(tenantId, chairId, application.id, { assessorEmployeeIds: [good], version: 99 }),
          ),
        ),
      ).toMatchObject({ code: 'stale_version' })
    })
  })

  describe('declareConflict', () => {
    let assessorId: string

    beforeEach(async () => {
      assessorId = await addEmployee()
      await seat(assessorId, 'mitra_bestari')
    })

    it('records a declaration of no conflict', async () => {
      const application = await stored('under_review', { assessors: [assessor(assessorId)] })

      const updated = await asAdmin(() =>
        service.declareConflict(tenantId, assessorId, application.id, { hasConflict: false }),
      )

      expect(updated.assessors[0]?.conflict_declaration).toEqual({
        declared_at: new Date('2026-03-10T12:00:00Z'),
        has_conflict: false,
        relationship: null,
      })
      expect(log.mock.calls[0]?.[0]).toMatchObject({ event: 'application_declare_conflict', outcome: 'success' })
    })

    it('records a conflict with its relationship and leaves other assessors alone', async () => {
      const other = await addEmployee()
      await seat(other, 'mitra_bestari')
      const application = await stored('under_review', { assessors: [assessor(other), assessor(assessorId)] })

      const updated = await asAdmin(() =>
        service.declareConflict(tenantId, assessorId, application.id, {
          hasConflict: true,
          relationship: { system: 'id.conflict-relationship', code: 'relative' },
        }),
      )

      expect(updated.assessors[0]?.conflict_declaration).toBeNull()
      expect(updated.assessors[1]?.conflict_declaration).toMatchObject({
        has_conflict: true,
        relationship: { system: 'id.conflict-relationship', code: 'relative' },
      })
      expect(JSON.stringify(log.mock.calls)).not.toContain('relative')
    })

    it('is final: a second declaration answers 409', async () => {
      const application = await stored('under_review', { assessors: [assessor(assessorId)] })
      await asAdmin(() => service.declareConflict(tenantId, assessorId, application.id, { hasConflict: false }))

      expect(
        await rejection(() =>
          asAdmin(() =>
            service.declareConflict(tenantId, assessorId, application.id, {
              hasConflict: true,
              relationship: { system: 'id.conflict-relationship', code: 'relative' },
            }),
          ),
        ),
      ).toMatchObject({ kind: 'conflict', code: 'declaration_exists' })
    })

    it('is personal: only an appointed assessor may declare, even a committee chair or the applicant', async () => {
      const application = await stored('under_review', { assessors: [assessor(assessorId)] })

      for (const caller of [null, chairId, applicantId, await addEmployee()]) {
        expect(
          await rejection(() =>
            asAdmin(() => service.declareConflict(tenantId, caller, application.id, { hasConflict: false })),
          ),
        ).toMatchObject({ kind: 'forbidden', code: 'not_an_assessor' })
      }
    })

    it('needs a relationship code of the conflict-relationship system exactly when there is a conflict', async () => {
      const application = await stored('under_review', { assessors: [assessor(assessorId)] })
      const call = (body: Parameters<ReviewService['declareConflict']>[3]) =>
        rejection(() => asAdmin(() => service.declareConflict(tenantId, assessorId, application.id, body)))

      expect(await call({ hasConflict: true })).toMatchObject({ code: 'relationship_required' })
      expect(
        await call({ hasConflict: false, relationship: { system: 'id.conflict-relationship', code: 'relative' } }),
      ).toMatchObject({ code: 'relationship_not_allowed' })
      expect(
        await call({ hasConflict: true, relationship: { system: 'id.evidence-type', code: 'certificate' } }),
      ).toMatchObject({ code: 'invalid_relationship' })
      expect(
        await call({ hasConflict: true, relationship: { system: 'id.conflict-relationship', code: 'unknown' } }),
      ).toMatchObject({ code: 'unknown_code' })
    })

    it('works only while under review', async () => {
      for (const status of ['draft', 'submitted', 'returned', 'assessed', 'recommended', 'withdrawn'] as const) {
        const application = await stored(status, { assessors: [assessor(assessorId)] })
        expect(
          await rejection(() =>
            asAdmin(() => service.declareConflict(tenantId, assessorId, application.id, { hasConflict: false })),
          ),
        ).toMatchObject({ code: 'invalid_transition' })
      }
    })

    it('answers 404 for a foreign application and 409 for a stale version', async () => {
      const application = await stored('under_review', { assessors: [assessor(assessorId)] })
      expect(
        await rejection(() =>
          asAdmin(() => service.declareConflict(otherTenantId, assessorId, application.id, { hasConflict: false })),
        ),
      ).toMatchObject({ code: 'application_not_found' })
      expect(
        await rejection(() =>
          asAdmin(() =>
            service.declareConflict(tenantId, assessorId, application.id, { hasConflict: false, version: 99 }),
          ),
        ),
      ).toMatchObject({ code: 'stale_version' })
    })
  })
})
