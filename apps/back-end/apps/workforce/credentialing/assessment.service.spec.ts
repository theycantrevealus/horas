import { Types } from 'mongoose'
import { runWithRequestContext } from '@utility/logger/context'
import { type AppLogger } from '@utility/logger/service'
import {
  type ApplicationAssessor,
  type CredentialApplication,
} from '@repository/model/credential-application'
import { CodeConceptService } from '../concept/code-concept.service'
import { type ParameterService } from '../parameter/parameter.service'
import {
  InMemoryCodeConcepts,
  InMemoryCommitteeMemberships,
  InMemoryCredentialApplications,
  InMemoryCredentialAssessments,
  InMemoryEmployees,
} from '../testing/in-memory'
import { AssessmentService } from './assessment.service'

describe('AssessmentService', () => {
  const tenantId = new Types.ObjectId().toHexString()
  const otherTenantId = new Types.ObjectId().toHexString()
  const log = vi.fn()
  const warn = vi.fn()
  const error = vi.fn()
  const debug = vi.fn()
  const record = vi.fn()
  const recordAccess = vi.fn()
  let minAssessors = 1
  let applications: InMemoryCredentialApplications
  let assessments: InMemoryCredentialAssessments
  let employees: InMemoryEmployees
  let memberships: InMemoryCommitteeMemberships
  let concepts: InMemoryCodeConcepts
  let service: AssessmentService
  let facilityId: string
  let applicantId: string
  let chairId: string
  let memberId: string
  let assessorA: string
  let assessorB: string
  let itemOne: string
  let itemTwo: string

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
   * Seats an employee on the committee.
   *
   * @param employeeId - The member.
   * @param role - Role code.
   */
  async function seat(employeeId: string, role: string) {
    await asAdmin(() =>
      memberships.create({
        tenant_id: tenantId,
        employee_id: employeeId,
        facility_id: facilityId,
        committee: { system: 'id.committee', code: 'komite_medik' },
        role: { system: 'id.committee-role', code: role },
        period: { start: '2026-01-01', end: null },
        decision_ref: null,
        status: 'active',
      }),
    )
  }

  /**
   * Builds an assessor entry.
   *
   * @param employeeId - The assessor.
   * @param conflict - `undefined` for no declaration, otherwise whether there is a conflict.
   * @returns The assessor entry.
   */
  function assessor(employeeId: string, conflict?: boolean): ApplicationAssessor {
    return {
      employee_id: employeeId,
      appointed_at: new Date('2026-03-02T00:00:00Z'),
      appointed_by: { account_id: 'a1', display_name: 'Admin', kind: 'account' },
      conflict_declaration:
        conflict === undefined
          ? null
          : {
              declared_at: new Date('2026-03-03T00:00:00Z'),
              has_conflict: conflict,
              relationship: conflict
                ? { system: 'id.conflict-relationship', code: 'relative' }
                : null,
            },
    }
  }

  /**
   * Stores an application asking for two privileges.
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
        requested_privileges: [
          { catalog_item_id: itemOne, code: 'PD-1', requested_condition: 'supervised', proposed_supervisor_employee_id: memberId, notes: null },
          { catalog_item_id: itemTwo, code: 'PD-2', requested_condition: 'restricted', proposed_supervisor_employee_id: null, notes: null },
        ],
        requested_unit_ids: [],
        requested_facility_ids: [facilityId],
        documents: [],
        assessors: [assessor(assessorA, false), assessor(assessorB, false)],
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

  const interview = { system: 'id.assessment-method', code: 'interview' }

  /**
   * A valid assessment of both requested privileges.
   *
   * @param override - Fields of the first item that replace the defaults.
   * @returns The `assessments` input.
   */
  function findings(override: Record<string, unknown> = {}) {
    return [
      { catalogItemId: itemOne, methods: [interview], outcome: 'recommended' as const, recommendedCondition: 'supervised' as const, reason: 'Kompeten Rahasia', ...override },
      { catalogItemId: itemTwo, methods: [interview], outcome: 'not_recommended' as const, reason: 'Belum cukup' },
    ]
  }

  /**
   * A valid recommendation of both requested privileges.
   *
   * @param override - Fields that replace the defaults.
   * @returns The recommendation input.
   */
  function recommendation(override: Record<string, unknown> = {}) {
    return {
      summary: 'Ringkasan Rahasia',
      privileges: [
        { catalogItemId: itemOne, outcome: 'recommended' as const, condition: 'supervised' as const, supervisorEmployeeId: memberId },
        { catalogItemId: itemTwo, outcome: 'recommended' as const, condition: 'restricted' as const, restrictionNotes: 'Hanya rawat jalan' },
      ],
      ...override,
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
    minAssessors = 1
    applications = new InMemoryCredentialApplications()
    assessments = new InMemoryCredentialAssessments()
    employees = new InMemoryEmployees()
    memberships = new InMemoryCommitteeMemberships()
    concepts = new InMemoryCodeConcepts()
    const logger = { log, warn, error, debug } as unknown as AppLogger
    const resolve = vi.fn(async () => ({ key: 'MIN_ASSESSORS', value: minAssessors }))
    service = new AssessmentService(
      applications,
      assessments,
      employees,
      memberships,
      new CodeConceptService(concepts, logger),
      { resolve } as unknown as ParameterService,
      { run: (work: () => Promise<unknown>) => work() } as never,
      { record, recordAccess } as never,
      logger,
    )
    await addConcept('id.assessment-method', 'interview')
    await addConcept('id.assessment-method', 'logbook')
    await addConcept('id.evidence-type', 'certificate')
    facilityId = new Types.ObjectId().toHexString()
    itemOne = new Types.ObjectId().toHexString()
    itemTwo = new Types.ObjectId().toHexString()
    applicantId = await addEmployee()
    chairId = await addEmployee()
    memberId = await addEmployee()
    assessorA = await addEmployee()
    assessorB = await addEmployee()
    await seat(chairId, 'chair')
    await seat(memberId, 'member')
    await seat(assessorA, 'mitra_bestari')
    await seat(assessorB, 'mitra_bestari')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('assess', () => {
    it('stores an assessment of every requested privilege, stays under review until every assessor without a conflict has assessed, then becomes assessed', async () => {
      const application = await stored('under_review')

      const first = await asAdmin(() =>
        service.assess(tenantId, assessorA, application.id, { assessments: findings() }),
      )
      expect(first.status).toBe('under_review')
      expect(first.assessments).toHaveLength(2)
      expect(first.assessments[0]).toMatchObject({
        application_id: application.id,
        employee_id: applicantId,
        assessor_employee_id: assessorA,
        catalog_item_id: itemOne,
        outcome: 'recommended',
        recommended_condition: 'supervised',
        methods: [interview],
        assessed_at: new Date('2026-03-10T12:00:00Z'),
      })
      expect(first.assessments[1]).toMatchObject({ outcome: 'not_recommended', recommended_condition: null })
      expect((await applications.findOne(application.id))?.status).toBe('under_review')

      const second = await asAdmin(() =>
        service.assess(tenantId, assessorB, application.id, { assessments: findings() }),
      )
      expect(second.status).toBe('assessed')
      const after = await applications.findOne(application.id)
      expect(after?.status).toBe('assessed')
      expect(after?.status_since).toEqual(new Date('2026-03-10T12:00:00Z'))
      expect(await assessments.findByApplication(tenantId, application.id)).toHaveLength(4)
    })

    it('does not wait for an assessor who declared a conflict, but waits for one who has not declared', async () => {
      const waiting = await stored('under_review', { assessors: [assessor(assessorA, false), assessor(assessorB)] })
      const done = await asAdmin(() => service.assess(tenantId, assessorA, waiting.id, { assessments: findings() }))
      expect(done.status).toBe('under_review')

      const conflicted = await stored('under_review', { assessors: [assessor(assessorA, false), assessor(assessorB, true)] })
      const finished = await asAdmin(() => service.assess(tenantId, assessorA, conflicted.id, { assessments: findings() }))
      expect(finished.status).toBe('assessed')
    })

    it('needs at least MIN_ASSESSORS assessments without a conflict before it becomes assessed', async () => {
      minAssessors = 2
      const application = await stored('under_review', { assessors: [assessor(assessorA, false), assessor(assessorB, true)] })

      const result = await asAdmin(() => service.assess(tenantId, assessorA, application.id, { assessments: findings() }))

      expect(result.status).toBe('under_review')
    })

    it('is personal: only an appointed assessor, never null, the chair or the applicant', async () => {
      const application = await stored('under_review')
      for (const caller of [null, chairId, applicantId, memberId]) {
        expect(
          await rejection(() => asAdmin(() => service.assess(tenantId, caller, application.id, { assessments: findings() }))),
        ).toMatchObject({ kind: 'forbidden', code: 'not_an_assessor' })
      }
    })

    it('needs a declaration first, and refuses an assessor with a conflict', async () => {
      const undeclared = await stored('under_review', { assessors: [assessor(assessorA)] })
      expect(
        await rejection(() => asAdmin(() => service.assess(tenantId, assessorA, undeclared.id, { assessments: findings() }))),
      ).toMatchObject({ kind: 'invalid', code: 'declaration_required' })
      const conflicted = await stored('under_review', { assessors: [assessor(assessorA, true)] })
      expect(
        await rejection(() => asAdmin(() => service.assess(tenantId, assessorA, conflicted.id, { assessments: findings() }))),
      ).toMatchObject({ kind: 'forbidden', code: 'conflict_declared' })
    })

    it('works only while under review', async () => {
      for (const status of ['draft', 'submitted', 'returned', 'assessed', 'recommended', 'withdrawn'] as const) {
        const application = await stored(status)
        expect(
          await rejection(() => asAdmin(() => service.assess(tenantId, assessorA, application.id, { assessments: findings() }))),
        ).toMatchObject({ code: 'invalid_transition' })
      }
    })

    it('answers 409 when the assessor already assessed, and keeps the first assessment', async () => {
      const application = await stored('under_review')
      await asAdmin(() => service.assess(tenantId, assessorA, application.id, { assessments: findings() }))

      expect(
        await rejection(() => asAdmin(() => service.assess(tenantId, assessorA, application.id, { assessments: findings({ reason: 'Lain' }) }))),
      ).toMatchObject({ kind: 'conflict', code: 'assessment_exists' })
      expect(await assessments.findByAssessor(tenantId, application.id, assessorA)).toHaveLength(2)
    })

    it('covers every requested privilege exactly once', async () => {
      const application = await stored('under_review')
      const run = (list: object[]) =>
        rejection(() => asAdmin(() => service.assess(tenantId, assessorA, application.id, { assessments: list as never })))

      expect(await run([findings()[0] as object])).toMatchObject({ code: 'assessment_incomplete' })
      expect(await run([])).toMatchObject({ code: 'assessment_incomplete' })
      expect(await run([...findings(), findings()[0] as object])).toMatchObject({ code: 'duplicate_privilege' })
      expect(
        await run([findings()[0] as object, { ...findings()[1], catalogItemId: new Types.ObjectId().toHexString() }]),
      ).toMatchObject({ code: 'privilege_not_requested' })
      expect(await assessments.findByApplication(tenantId, application.id)).toEqual([])
    })

    it('checks the methods, the outcome, the condition and the reason', async () => {
      const application = await stored('under_review')
      const run = (override: Record<string, unknown>) =>
        rejection(() => asAdmin(() => service.assess(tenantId, assessorA, application.id, { assessments: findings(override) as never })))

      expect(await run({ methods: [] })).toMatchObject({ code: 'invalid_methods' })
      expect(await run({ methods: [interview, interview] })).toMatchObject({ code: 'invalid_methods' })
      expect(await run({ methods: [{ system: 'id.evidence-type', code: 'certificate' }] })).toMatchObject({ code: 'invalid_method' })
      expect(await run({ methods: [{ system: 'id.assessment-method', code: 'unknown' }] })).toMatchObject({ code: 'unknown_code' })
      expect(await run({ outcome: 'maybe' })).toMatchObject({ code: 'invalid_outcome' })
      expect(await run({ recommendedCondition: undefined })).toMatchObject({ code: 'condition_required' })
      expect(await run({ recommendedCondition: 'any' })).toMatchObject({ code: 'invalid_condition' })
      expect(await run({ outcome: 'not_recommended', recommendedCondition: 'full' })).toMatchObject({ code: 'condition_not_allowed' })
      expect(await run({ reason: '  ' })).toMatchObject({ code: 'reason_required' })
      expect(await run({ reason: 'x'.repeat(2001) })).toMatchObject({ code: 'invalid_reason' })
      expect(await assessments.findByApplication(tenantId, application.id)).toEqual([])
    })

    it('answers 404 for a missing, malformed or foreign application and 409 for a stale version', async () => {
      const foreign = await stored('under_review', { tenant_id: otherTenantId })
      for (const id of [new Types.ObjectId().toHexString(), 'bad', foreign.id]) {
        expect(
          await rejection(() => asAdmin(() => service.assess(tenantId, assessorA, id, { assessments: findings() }))),
        ).toMatchObject({ code: 'application_not_found' })
      }
      const application = await stored('under_review')
      expect(
        await rejection(() => asAdmin(() => service.assess(tenantId, assessorA, application.id, { assessments: findings(), version: 99 }))),
      ).toMatchObject({ code: 'stale_version' })
    })

    it('logs one entry without the reason text', async () => {
      const application = await stored('under_review')
      await asAdmin(() => service.assess(tenantId, assessorA, application.id, { assessments: findings() }))

      expect(log).toHaveBeenCalledTimes(1)
      expect(log.mock.calls[0]?.[0]).toMatchObject({ event: 'assessment_create', outcome: 'success' })
      expect(JSON.stringify([log.mock.calls, warn.mock.calls])).not.toContain('Kompeten Rahasia')
    })
  })

  describe('list', () => {
    it('shows every assessment to the chair, a secretary or a member, and records one access per assessment read', async () => {
      const application = await stored('under_review')
      await asAdmin(() => service.assess(tenantId, assessorA, application.id, { assessments: findings() }))
      await asAdmin(() => service.assess(tenantId, assessorB, application.id, { assessments: findings() }))
      log.mockClear()

      for (const caller of [chairId, memberId]) {
        recordAccess.mockClear()
        const found = await asAdmin(() => service.list(tenantId, caller, application.id))
        expect(found).toHaveLength(4)
        expect(recordAccess).toHaveBeenCalledTimes(4)
        expect(recordAccess).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'credential_assessment', tenantId, operation: 'AssessmentService.list' }),
        )
      }
      expect(log).not.toHaveBeenCalled()
    })

    it('shows an assessor only their own assessments', async () => {
      const application = await stored('under_review')
      await asAdmin(() => service.assess(tenantId, assessorA, application.id, { assessments: findings() }))
      await asAdmin(() => service.assess(tenantId, assessorB, application.id, { assessments: findings() }))

      const found = await asAdmin(() => service.list(tenantId, assessorA, application.id))

      expect(found).toHaveLength(2)
      expect(found.every((item) => item.assessor_employee_id === assessorA)).toBe(true)
      expect(recordAccess).toHaveBeenCalledTimes(2)
    })

    it('refuses a caller without a seat, writes no access record and writes no log entry, even when the application is missing', async () => {
      const application = await stored('under_review')
      await asAdmin(() => service.assess(tenantId, assessorA, application.id, { assessments: findings() }))
      log.mockClear()

      for (const caller of [null, applicantId, await addEmployee()]) {
        expect(
          await rejection(() => asAdmin(() => service.list(tenantId, caller, application.id))),
        ).toMatchObject({ kind: 'forbidden', code: 'not_committee_member' })
      }
      expect(
        await rejection(() => asAdmin(() => service.list(tenantId, chairId, 'bad'))),
      ).toMatchObject({ code: 'application_not_found' })
      expect(recordAccess).not.toHaveBeenCalled()
      expect([log, warn, error, debug].every((spy) => spy.mock.calls.length === 0)).toBe(true)
    })

    it('records nothing when there is nothing to read, and does not return data when recording fails', async () => {
      const application = await stored('under_review')
      expect(await asAdmin(() => service.list(tenantId, chairId, application.id))).toEqual([])
      expect(recordAccess).not.toHaveBeenCalled()

      await asAdmin(() => service.assess(tenantId, assessorA, application.id, { assessments: findings() }))
      recordAccess.mockRejectedValueOnce(new Error('outbox down'))
      await expect(asAdmin(() => service.list(tenantId, chairId, application.id))).rejects.toThrow('outbox down')
    })
  })

  describe('recommend', () => {
    it('lets the chair sign a recommendation of every privilege and records who and when', async () => {
      const application = await stored('assessed')

      const updated = await asAdmin(() => service.recommend(tenantId, chairId, application.id, recommendation()))

      expect(updated.status).toBe('recommended')
      expect(updated.status_since).toEqual(new Date('2026-03-10T12:00:00Z'))
      expect(updated.recommendation).toMatchObject({
        decided_at: new Date('2026-03-10T12:00:00Z'),
        signed_by: { account_id: 'a1' },
        summary: 'Ringkasan Rahasia',
        privileges: [
          { catalog_item_id: itemOne, outcome: 'recommended', condition: 'supervised', supervisor_employee_id: memberId, restriction_notes: null },
          { catalog_item_id: itemTwo, outcome: 'recommended', condition: 'restricted', supervisor_employee_id: null, restriction_notes: 'Hanya rawat jalan' },
        ],
      })
      expect(log.mock.calls[0]?.[0]).toMatchObject({ event: 'application_recommend', outcome: 'success' })
      expect(JSON.stringify(log.mock.calls)).not.toContain('Ringkasan Rahasia')
    })

    it('accepts a recommendation of nothing: every privilege not recommended', async () => {
      const application = await stored('assessed')
      const updated = await asAdmin(() =>
        service.recommend(tenantId, chairId, application.id, {
          summary: 'Tidak direkomendasikan',
          privileges: [
            { catalogItemId: itemOne, outcome: 'not_recommended' },
            { catalogItemId: itemTwo, outcome: 'not_recommended' },
          ],
        }),
      )
      expect(updated.status).toBe('recommended')
      expect(updated.recommendation?.privileges.every((item) => item.condition === null)).toBe(true)
    })

    it('lets a temporary application be recommended from under review, without assessment', async () => {
      const temporary = await stored('under_review', {
        type: 'temporary',
        temporary: { requested_days: 10, urgency: { system: 'id.temporary-urgency', code: 'disaster' } },
        assessors: [],
      })
      expect((await asAdmin(() => service.recommend(tenantId, chairId, temporary.id, recommendation()))).status).toBe('recommended')

      const initial = await stored('under_review')
      expect(
        await rejection(() => asAdmin(() => service.recommend(tenantId, chairId, initial.id, recommendation()))),
      ).toMatchObject({ code: 'invalid_transition' })
    })

    it('works only from assessed (or a temporary under review)', async () => {
      for (const status of ['draft', 'submitted', 'returned', 'recommended', 'withdrawn'] as const) {
        const application = await stored(status)
        expect(
          await rejection(() => asAdmin(() => service.recommend(tenantId, chairId, application.id, recommendation()))),
        ).toMatchObject({ code: 'invalid_transition' })
      }
    })

    it('is for the chair: a member, a secretary, an assessor and a stranger are refused', async () => {
      const application = await stored('assessed')
      const secretary = await addEmployee()
      await seat(secretary, 'secretary')

      for (const caller of [memberId, secretary, assessorA]) {
        expect(
          await rejection(() => asAdmin(() => service.recommend(tenantId, caller, application.id, recommendation()))),
        ).toMatchObject({ kind: 'forbidden', code: 'not_committee_chair' })
      }
      for (const caller of [null, applicantId, await addEmployee()]) {
        expect(
          await rejection(() => asAdmin(() => service.recommend(tenantId, caller, application.id, recommendation()))),
        ).toMatchObject({ kind: 'forbidden', code: 'not_committee_member' })
      }
      expect((await applications.findOne(application.id))?.status).toBe('assessed')
    })

    it('never recommends more than was requested', async () => {
      const application = await stored('assessed')
      const privileges = (first: object, second: object) => ({
        privileges: [{ catalogItemId: itemOne, ...first }, { catalogItemId: itemTwo, ...second }],
      })
      const run = (override: object) =>
        rejection(() => asAdmin(() => service.recommend(tenantId, chairId, application.id, recommendation(override))))

      expect(
        await run(privileges({ outcome: 'recommended', condition: 'full' }, { outcome: 'not_recommended' })),
      ).toMatchObject({ code: 'condition_exceeds_request' })
      expect(
        await run(privileges({ outcome: 'not_recommended' }, { outcome: 'recommended', condition: 'full' })),
      ).toMatchObject({ code: 'condition_exceeds_request' })
      // Swapping supervised and restricted is allowed.
      const swapped = await asAdmin(() =>
        service.recommend(tenantId, chairId, application.id, {
          summary: 'x',
          privileges: [
            { catalogItemId: itemOne, outcome: 'recommended', condition: 'restricted', restrictionNotes: 'Terbatas' },
            { catalogItemId: itemTwo, outcome: 'recommended', condition: 'supervised', supervisorEmployeeId: memberId },
          ],
        }),
      )
      expect(swapped.status).toBe('recommended')
    })

    it('checks the condition, the supervisor and the notes of each privilege', async () => {
      const application = await stored('assessed')
      const first = (item: object) => ({ privileges: [{ catalogItemId: itemOne, ...item }, { catalogItemId: itemTwo, outcome: 'not_recommended' as const }] })
      const run = (override: object) =>
        rejection(() => asAdmin(() => service.recommend(tenantId, chairId, application.id, recommendation(override))))
      const separated = await addEmployee('separated')

      expect(await run(first({ outcome: 'maybe' }))).toMatchObject({ code: 'invalid_outcome' })
      expect(await run(first({ outcome: 'recommended' }))).toMatchObject({ code: 'condition_required' })
      expect(await run(first({ outcome: 'recommended', condition: 'any' }))).toMatchObject({ code: 'invalid_condition' })
      expect(await run(first({ outcome: 'not_recommended', condition: 'supervised' }))).toMatchObject({ code: 'condition_not_allowed' })
      expect(await run(first({ outcome: 'not_recommended', supervisorEmployeeId: memberId }))).toMatchObject({ code: 'condition_not_allowed' })
      expect(await run(first({ outcome: 'recommended', condition: 'supervised' }))).toMatchObject({ code: 'supervisor_required' })
      for (const bad of [applicantId, separated, await addEmployee('active', otherTenantId), new Types.ObjectId().toHexString()]) {
        expect(
          await run(first({ outcome: 'recommended', condition: 'supervised', supervisorEmployeeId: bad })),
        ).toMatchObject({ code: 'supervisor_invalid' })
      }
      expect(
        await run(first({ outcome: 'recommended', condition: 'restricted', supervisorEmployeeId: memberId, restrictionNotes: 'x' })),
      ).toMatchObject({ code: 'supervisor_not_allowed' })
      expect(await run(first({ outcome: 'recommended', condition: 'restricted' }))).toMatchObject({ code: 'notes_required' })
      expect(
        await run(first({ outcome: 'recommended', condition: 'restricted', restrictionNotes: 'x'.repeat(501) })),
      ).toMatchObject({ code: 'invalid_notes' })
    })

    it('covers every requested privilege exactly once, with a summary of 1 to 2000 characters', async () => {
      const application = await stored('assessed')
      const run = (override: object) =>
        rejection(() => asAdmin(() => service.recommend(tenantId, chairId, application.id, recommendation(override))))

      expect(await run({ privileges: [] })).toMatchObject({ code: 'recommendation_incomplete' })
      expect(
        await run({ privileges: [{ catalogItemId: itemOne, outcome: 'not_recommended' }] }),
      ).toMatchObject({ code: 'recommendation_incomplete' })
      expect(
        await run({ privileges: [{ catalogItemId: itemOne, outcome: 'not_recommended' }, { catalogItemId: itemOne, outcome: 'not_recommended' }] }),
      ).toMatchObject({ code: 'duplicate_privilege' })
      expect(
        await run({ privileges: [{ catalogItemId: itemOne, outcome: 'not_recommended' }, { catalogItemId: new Types.ObjectId().toHexString(), outcome: 'not_recommended' }] }),
      ).toMatchObject({ code: 'privilege_not_requested' })
      expect(await run({ summary: '  ' })).toMatchObject({ code: 'summary_required' })
      expect(await run({ summary: 'x'.repeat(2001) })).toMatchObject({ code: 'invalid_summary' })
    })

    it('answers 404 for a missing, malformed or foreign application and 409 for a stale version', async () => {
      const foreign = await stored('assessed', { tenant_id: otherTenantId })
      for (const id of [new Types.ObjectId().toHexString(), 'bad', foreign.id]) {
        expect(
          await rejection(() => asAdmin(() => service.recommend(tenantId, chairId, id, recommendation()))),
        ).toMatchObject({ code: 'application_not_found' })
      }
      const application = await stored('assessed')
      expect(
        await rejection(() => asAdmin(() => service.recommend(tenantId, chairId, application.id, recommendation({ version: 99 })))),
      ).toMatchObject({ code: 'stale_version' })
    })
  })
})
