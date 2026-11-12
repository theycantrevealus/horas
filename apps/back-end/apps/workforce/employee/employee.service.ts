import { Inject, Injectable } from '@nestjs/common'
import {
  RepositoryConflictError,
  RepositoryNotFoundError,
} from '@utility/database/error'
import { type Page } from '@utility/database/interface'
import { withChangeReason } from '@utility/history/reason'
import { AppLogger } from '@utility/logger/service'
import {
  compareLocalDates,
  isLocalDate,
  todayUtc,
} from '@utility/validation/local-date'
import { type EmployeeRepository } from '@repository/interface/employee'
import { type Coding } from '@repository/model/common/coding'
import { type ContactPoint } from '@repository/model/common/contact-point'
import { type ExternalId } from '@repository/model/common/external-id'
import { type HumanName } from '@repository/model/common/human-name'
import {
  type Employee,
  type EmployeeSpecialty,
  type EmploymentStatus,
} from '@repository/model/employee'
import { REPOSITORY_EMPLOYEE } from '@repository/token'
import { CodeConceptService } from '../concept/code-concept.service'
import { observe } from '../observe'
import {
  ConflictError,
  InvalidRequestError,
  NotFoundError,
} from '../workforce.error'
import { normalizeExternalIds } from '../structure/external-ids'
import { type ContactInput, normalizeWorkContacts } from './contacts'
import { type NameInput, normalizeName, normalizeOtherNames } from './names'
import { canTransition, latestEffectiveDate, needsReason } from './status'

const NAME = 'EmployeeService'

/**
 * Code system of the administrative gender: the international FHIR value set, fixed in code
 * (HR plan E3).
 */
export const GENDER_SYSTEM = 'fhir.administrative-gender'

/**
 * Codes of the administrative gender.
 */
export const GENDER_CODES = ['male', 'female', 'other', 'unknown'] as const

/**
 * Administrative gender as sent by a client.
 */
export type GenderCode = (typeof GENDER_CODES)[number]

/**
 * Shape of an employee number: upper case letters, digits, dots, hyphens, underscores and slashes,
 * 1 to 32 characters, starting with a letter or digit (HR plan E1).
 */
const NUMBER_PATTERN = /^[A-Z0-9][A-Z0-9._/-]{0,31}$/

/**
 * Shape of a BCP 47 language tag.
 */
const LANGUAGE_PATTERN = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/

/**
 * Earliest hire date accepted (HR plan E14).
 */
const EARLIEST_HIRE_DATE = '1950-01-01'

/**
 * Most specialties one employee can hold (HR plan E6).
 */
const MAX_SPECIALTIES = 10

/**
 * Code system name suffixes, after an optional country prefix.
 */
const SYSTEMS = {
  category: /(^|\.)workforce-category$/,
  profession: /(^|\.)profession$/,
  specialty: /(^|\.)specialty$/,
  level: /(^|\.)clinical-level$/,
} as const

/**
 * Filters and paging of the employee search.
 *
 * @property name - Part of the display name.
 * @property employeeNumber - Start of the employee number.
 * @property status - Employment status.
 * @property workforceCategory - Code of the workforce category.
 * @property isClinical - Only clinical or only non-clinical employees.
 * @property unitId - Unit of the primary assignment.
 * @property limit - Page size.
 * @property offset - Records to skip.
 */
export interface ListEmployeesInput {
  name?: string
  employeeNumber?: string
  status?: EmploymentStatus
  workforceCategory?: string
  isClinical?: boolean
  unitId?: string
  limit?: number
  offset?: number
}

/**
 * A specialty as sent by a client.
 *
 * @property coding - The specialty.
 * @property is_primary - Main specialty.
 */
export interface SpecialtyInput {
  coding: Coding
  is_primary?: boolean
}

/**
 * Data of a new employee.
 *
 * @property employeeNumber - Hospital-issued number.
 * @property name - Official name.
 * @property otherNames - Usual and native-script names.
 * @property administrativeGender - FHIR administrative gender.
 * @property workforceCategory - Workforce category code.
 * @property profession - Profession; required for clinical categories.
 * @property specialties - Specialties; clinical employees only.
 * @property clinicalLevel - Career level; clinical employees only.
 * @property hireDate - First day of employment.
 * @property practitionerIds - Public registry numbers.
 * @property workContacts - Work email and phone.
 * @property preferredLanguage - BCP 47 tag.
 */
export interface RegisterEmployeeInput {
  employeeNumber: string
  name: NameInput
  otherNames?: NameInput[]
  administrativeGender?: GenderCode | null
  workforceCategory: Coding
  profession?: Coding | null
  specialties?: SpecialtyInput[]
  clinicalLevel?: Coding | null
  hireDate: string
  practitionerIds?: ExternalId[]
  workContacts?: ContactInput[]
  preferredLanguage?: string | null
}

/**
 * Changes to an employee. The number, status, separation date and the summaries are not here
 * (HR plan E12). The category and hire date change only while the employee is onboarding (E13).
 *
 * @property name - New official name.
 * @property otherNames - New other names, replacing the old ones.
 * @property administrativeGender - New gender, or `null` to clear it.
 * @property workforceCategory - New category; onboarding only.
 * @property profession - New profession, or `null` to clear it.
 * @property specialties - New specialties, replacing the old ones.
 * @property clinicalLevel - New level, or `null` to clear it.
 * @property hireDate - New hire date; onboarding only.
 * @property practitionerIds - New registry numbers, replacing the old ones.
 * @property workContacts - New work contacts, replacing the old ones.
 * @property preferredLanguage - New language, or `null` to clear it.
 * @property version - Version the caller read.
 * @property reason - Why the data changes, kept in the change history.
 */
export interface UpdateEmployeeInput {
  name?: NameInput
  otherNames?: NameInput[]
  administrativeGender?: GenderCode | null
  workforceCategory?: Coding
  profession?: Coding | null
  specialties?: SpecialtyInput[]
  clinicalLevel?: Coding | null
  hireDate?: string
  practitionerIds?: ExternalId[]
  workContacts?: ContactInput[]
  preferredLanguage?: string | null
  version?: number
  reason?: string
}

/**
 * Data of a status change.
 *
 * @property status - New status.
 * @property effectiveDate - Day the change takes effect; defaults to today in UTC.
 * @property reason - Why; required for `suspended` and `separated`.
 * @property version - Version the caller read.
 */
export interface ChangeStatusInput {
  status: EmploymentStatus
  effectiveDate?: string
  reason?: string
  version?: number
}

/**
 * The fields that depend on the workforce category, checked together.
 */
interface Classification {
  workforce_category: Coding
  is_clinical: boolean
  profession: Coding | null
  specialties: EmployeeSpecialty[]
  clinical_level: Coding | null
}

/**
 * Employee records (public and internal data) of a tenant. Never deletes: an employee is
 * separated. Confidential data is in the private profile, not here.
 */
@Injectable()
export class EmployeeService {
  /**
   * @param employees - Employee repository.
   * @param concepts - Code concepts, to check categories, professions, specialties and levels.
   * @param logger - Logger of this service.
   */
  constructor(
    @Inject(REPOSITORY_EMPLOYEE)
    private readonly employees: EmployeeRepository,
    @Inject(CodeConceptService) private readonly concepts: CodeConceptService,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * Searches the employees of a tenant, ordered by employee number. Writes no log entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param input - Filters and paging.
   * @returns One page of employees.
   */
  list(tenantId: string, input: ListEmployeesInput): Promise<Page<Employee>> {
    return this.employees.findPage(tenantId, {
      name: input.name,
      employeeNumber: input.employeeNumber?.toUpperCase(),
      status: input.status,
      workforceCategoryCode: input.workforceCategory,
      isClinical: input.isClinical,
      unitId: input.unitId,
      limit: input.limit,
      offset: input.offset,
    })
  }

  /**
   * Returns one employee. Writes no log entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Employee identifier.
   * @returns The employee.
   * @throws NotFoundError `employee_not_found` when it does not exist in the tenant.
   */
  get(tenantId: string, id: string): Promise<Employee> {
    return this.load(tenantId, id)
  }

  /**
   * Returns the record of the signed-in user's own employee. Writes no log entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - Employee linked to the caller's account, from the token, or `null`.
   * @returns The employee.
   * @throws NotFoundError `employee_not_found` when the account has no employee.
   */
  getOwn(tenantId: string, employeeId: string | null): Promise<Employee> {
    if (employeeId === null) {
      return Promise.reject(this.notFound())
    }
    return this.load(tenantId, employeeId)
  }

  /**
   * Registers an employee, `onboarding`, with the hire date as the start of the status.
   *
   * @param tenantId - Tenant of the caller.
   * @param input - The employee.
   * @returns The created employee.
   * @throws InvalidRequestError `invalid_employee_number`, `invalid_name`, `invalid_other_names`,
   * `invalid_gender`, `invalid_hire_date`, `invalid_practitioner_ids`, `invalid_contacts`,
   * `invalid_language`, `invalid_category`, `invalid_profession`, `profession_required`,
   * `profession_category_mismatch`, `specialties_not_allowed`, `invalid_specialties`,
   * `clinical_level_not_allowed`, `invalid_clinical_level`, `unknown_code`, `code_retired` or
   * `code_not_in_period`.
   * @throws ConflictError `employee_exists` when the number is taken; `practitioner_id_taken`.
   */
  register(tenantId: string, input: RegisterEmployeeInput): Promise<Employee> {
    return observe(
      this.logger,
      'employee_create',
      `${NAME}.register`,
      async () => {
        const employeeNumber = input.employeeNumber.trim().toUpperCase()
        if (!NUMBER_PATTERN.test(employeeNumber)) {
          throw new InvalidRequestError(
            'invalid_employee_number',
            'The employee number must have 1 to 32 letters, digits, dots, hyphens, underscores or slashes.',
          )
        }
        const name = this.checkName(input.name)
        const otherNames = this.checkOtherNames(input.otherNames ?? [])
        const gender = this.checkGender(input.administrativeGender ?? null)
        const hireDate = this.checkHireDate(input.hireDate)
        const practitionerIds = this.checkPractitionerIds(
          input.practitionerIds ?? [],
        )
        const contacts = this.checkContacts(input.workContacts ?? [])
        const language = this.checkLanguage(input.preferredLanguage ?? null)
        const classification = await this.classify(tenantId, {
          category: input.workforceCategory,
          profession: input.profession ?? null,
          specialties: input.specialties ?? [],
          level: input.clinicalLevel ?? null,
          fresh: { category: true, profession: true, level: true },
        })
        if (await this.employees.findByNumber(tenantId, employeeNumber)) {
          throw this.exists()
        }
        await this.assertPractitionerIdsFree(tenantId, practitionerIds, null)
        try {
          return await this.employees.create({
            tenant_id: tenantId,
            employee_number: employeeNumber,
            name,
            other_names: otherNames,
            display_name: name.text,
            administrative_gender: gender,
            ...classification,
            employment_status: 'onboarding',
            employment_status_since: hireDate,
            current_employment: null,
            primary_assignment: null,
            original_hire_date: hireDate,
            separation_date: null,
            practitioner_ids: practitionerIds,
            work_contacts: contacts,
            photo: null,
            preferred_language: language,
          })
        } catch (error: unknown) {
          if (error instanceof RepositoryConflictError) {
            // Two requests at once: a unique index decided. Tell which rule it was.
            throw (await this.employees.findByNumber(tenantId, employeeNumber))
              ? this.exists()
              : this.practitionerTaken()
          }
          throw error
        }
      },
    )
  }

  /**
   * Edits an employee that has not separated. The category and hire date can change only while
   * the employee is onboarding.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Employee identifier.
   * @param input - Fields to change.
   * @returns The updated employee.
   * @throws InvalidRequestError `empty_update`, `employee_separated`, `employee_started`, and the
   * validation codes of `register`.
   * @throws NotFoundError `employee_not_found`.
   * @throws ConflictError `practitioner_id_taken`, `stale_version`.
   */
  update(
    tenantId: string,
    id: string,
    input: UpdateEmployeeInput,
  ): Promise<Employee> {
    return observe(
      this.logger,
      'employee_update',
      `${NAME}.update`,
      async () => {
        const changes: Partial<Employee> = {}
        if (input.name !== undefined) {
          const name = this.checkName(input.name)
          changes.name = name
          changes.display_name = name.text
        }
        if (input.otherNames !== undefined) {
          changes.other_names = this.checkOtherNames(input.otherNames)
        }
        if (input.administrativeGender !== undefined) {
          changes.administrative_gender = this.checkGender(
            input.administrativeGender,
          )
        }
        if (input.hireDate !== undefined) {
          const hireDate = this.checkHireDate(input.hireDate)
          changes.original_hire_date = hireDate
          changes.employment_status_since = hireDate
        }
        if (input.practitionerIds !== undefined) {
          changes.practitioner_ids = this.checkPractitionerIds(
            input.practitionerIds,
          )
        }
        if (input.workContacts !== undefined) {
          changes.work_contacts = this.checkContacts(input.workContacts)
        }
        if (input.preferredLanguage !== undefined) {
          changes.preferred_language = this.checkLanguage(
            input.preferredLanguage,
          )
        }
        const reclassify =
          input.workforceCategory !== undefined ||
          input.profession !== undefined ||
          input.specialties !== undefined ||
          input.clinicalLevel !== undefined
        if (Object.keys(changes).length === 0 && !reclassify) {
          throw new InvalidRequestError(
            'empty_update',
            'Send at least one field to change.',
          )
        }
        const employee = await this.loadOpen(tenantId, id)
        if (
          (input.workforceCategory !== undefined ||
            input.hireDate !== undefined) &&
          employee.employment_status !== 'onboarding'
        ) {
          throw new InvalidRequestError(
            'employee_started',
            'The category and the hire date can only change while the employee is onboarding.',
          )
        }
        if (reclassify) {
          Object.assign(
            changes,
            await this.classify(tenantId, {
              category: input.workforceCategory ?? employee.workforce_category,
              profession:
                input.profession !== undefined
                  ? input.profession
                  : employee.profession,
              specialties:
                input.specialties ??
                employee.specialties.map(({ coding, is_primary }) => ({
                  coding,
                  is_primary,
                })),
              level:
                input.clinicalLevel !== undefined
                  ? input.clinicalLevel
                  : employee.clinical_level,
              fresh: {
                category: input.workforceCategory !== undefined,
                profession: input.profession !== undefined,
                level: input.clinicalLevel !== undefined,
              },
              freshSpecialties: input.specialties !== undefined,
            }),
          )
        }
        if (changes.practitioner_ids) {
          await this.assertPractitionerIdsFree(
            tenantId,
            changes.practitioner_ids,
            employee.id,
          )
        }
        return this.write(employee.id, input.reason, input.version, changes)
      },
    )
  }

  /**
   * Changes the employment status along the allowed transitions (HR plan E15), with the status
   * date and, for `separated`, the separation date in one write.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Employee identifier.
   * @param input - New status, date, reason and version.
   * @returns The updated employee.
   * @throws InvalidRequestError `invalid_transition`, `reason_required`, `invalid_effective_date`
   * or `effective_date_out_of_range`.
   * @throws NotFoundError `employee_not_found`.
   * @throws ConflictError `stale_version`.
   */
  changeStatus(
    tenantId: string,
    id: string,
    input: ChangeStatusInput,
  ): Promise<Employee> {
    return observe(
      this.logger,
      'employee_status_change',
      `${NAME}.changeStatus`,
      async () => {
        if (
          input.effectiveDate !== undefined &&
          !isLocalDate(input.effectiveDate)
        ) {
          throw new InvalidRequestError(
            'invalid_effective_date',
            'The effective date must be a date like 2026-01-31.',
          )
        }
        const employee = await this.load(tenantId, id)
        if (!canTransition(employee.employment_status, input.status)) {
          throw new InvalidRequestError(
            'invalid_transition',
            'The employment status cannot change to that status from the current one.',
          )
        }
        if (needsReason(input.status) && !input.reason) {
          throw new InvalidRequestError(
            'reason_required',
            'Give a reason for this status change.',
          )
        }
        const date = input.effectiveDate ?? todayUtc()
        if (
          compareLocalDates(date, employee.employment_status_since) < 0 ||
          compareLocalDates(date, latestEffectiveDate()) > 0
        ) {
          throw new InvalidRequestError(
            'effective_date_out_of_range',
            'The effective date cannot be before the current status started or later than tomorrow.',
          )
        }
        return this.write(employee.id, input.reason, input.version, {
          employment_status: input.status,
          employment_status_since: date,
          ...(input.status === 'separated' ? { separation_date: date } : {}),
        })
      },
    )
  }

  /**
   * Runs a repository write, with the change reason when given, and turns repository rejections
   * into workforce errors.
   *
   * @param id - Employee identifier.
   * @param reason - Optional reason for the change history.
   * @param version - Version the caller read.
   * @param changes - Fields to write.
   * @returns The updated employee.
   */
  private async write(
    id: string,
    reason: string | undefined,
    version: number | undefined,
    changes: Partial<Employee>,
  ): Promise<Employee> {
    const write = () =>
      this.employees.update(id, changes, { expectedVersion: version })
    try {
      return await (reason ? withChangeReason(reason, write) : write())
    } catch (error: unknown) {
      if (error instanceof RepositoryConflictError) {
        throw new ConflictError(
          'stale_version',
          'The employee was changed by someone else. Reload the record and try again.',
        )
      }
      if (error instanceof RepositoryNotFoundError) {
        throw this.notFound()
      }
      throw error
    }
  }

  /**
   * Loads an employee of the caller's tenant.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Employee identifier.
   * @returns The employee.
   * @throws NotFoundError `employee_not_found`.
   */
  private async load(tenantId: string, id: string): Promise<Employee> {
    const employee = await this.employees.findOne(id)
    if (!employee || employee.tenant_id !== tenantId) {
      throw this.notFound()
    }
    return employee
  }

  /**
   * Loads an employee that can still be edited.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Employee identifier.
   * @returns The employee.
   * @throws NotFoundError `employee_not_found`.
   * @throws InvalidRequestError `employee_separated`.
   */
  private async loadOpen(tenantId: string, id: string): Promise<Employee> {
    const employee = await this.load(tenantId, id)
    if (employee.employment_status === 'separated') {
      throw new InvalidRequestError(
        'employee_separated',
        'The employee has separated and cannot be edited.',
      )
    }
    return employee
  }

  /**
   * Checks the fields that depend on the workforce category together (HR plan E4 to E7): the
   * category, the profession and its match to the category, the specialties and the level. Values
   * that did not come from the request are only checked for consistency, not for being active, so
   * editing one field of an old record does not fail because another code has since been retired.
   *
   * @param tenantId - Tenant of the caller.
   * @param values - The values to check and which of them the request sent.
   * @returns The classification to store.
   */
  private async classify(
    tenantId: string,
    values: {
      category: Coding
      profession: Coding | null
      specialties: SpecialtyInput[]
      level: Coding | null
      fresh: { category: boolean; profession: boolean; level: boolean }
      freshSpecialties?: boolean
    },
  ): Promise<Classification> {
    if (!SYSTEMS.category.test(values.category.system)) {
      throw new InvalidRequestError(
        'invalid_category',
        'The category must come from a workforce-category code system, for example id.workforce-category.',
      )
    }
    const categoryConcept = values.fresh.category
      ? await this.concepts.assertActive(tenantId, values.category)
      : await this.concepts.resolve(
          tenantId,
          values.category.system,
          values.category.code,
        )
    const isClinical = categoryConcept?.properties?.is_clinical === true
    const profession = await this.checkProfession(
      tenantId,
      values.profession,
      values.category,
      isClinical,
      values.fresh.profession,
    )
    const specialties = await this.checkSpecialties(
      tenantId,
      values.specialties,
      isClinical,
      values.freshSpecialties ?? true,
    )
    const level = await this.checkLevel(
      tenantId,
      values.level,
      isClinical,
      values.fresh.level,
    )
    return {
      workforce_category: {
        system: values.category.system,
        code: values.category.code,
      },
      is_clinical: isClinical,
      profession,
      specialties,
      clinical_level: level,
    }
  }

  /**
   * Checks the profession: required for clinical categories, from a profession system, active
   * when newly sent, and belonging to the category (HR plan E5).
   *
   * @param tenantId - Tenant of the caller.
   * @param profession - The profession, or `null`.
   * @param category - The workforce category.
   * @param isClinical - Whether the category is clinical.
   * @param fresh - Whether the request sent the profession.
   * @returns The cleaned profession, or `null`.
   */
  private async checkProfession(
    tenantId: string,
    profession: Coding | null,
    category: Coding,
    isClinical: boolean,
    fresh: boolean,
  ): Promise<Coding | null> {
    if (profession === null) {
      if (isClinical) {
        throw new InvalidRequestError(
          'profession_required',
          'A clinical employee needs a profession.',
        )
      }
      return null
    }
    if (!SYSTEMS.profession.test(profession.system)) {
      throw new InvalidRequestError(
        'invalid_profession',
        'The profession must come from a profession code system, for example id.profession.',
      )
    }
    const concept = fresh
      ? await this.concepts.assertActive(tenantId, profession)
      : await this.concepts.resolve(
          tenantId,
          profession.system,
          profession.code,
        )
    if (concept?.properties?.workforce_category !== category.code) {
      throw new InvalidRequestError(
        'profession_category_mismatch',
        'The profession does not belong to the workforce category.',
      )
    }
    return { system: profession.system, code: profession.code }
  }

  /**
   * Checks the specialties: clinical employees only, at most 10, from a specialty system, active
   * when newly sent, no repeats, exactly one primary (HR plan E6).
   *
   * @param tenantId - Tenant of the caller.
   * @param specialties - The specialties.
   * @param isClinical - Whether the category is clinical.
   * @param fresh - Whether the request sent the specialties.
   * @returns The cleaned specialties.
   */
  private async checkSpecialties(
    tenantId: string,
    specialties: SpecialtyInput[],
    isClinical: boolean,
    fresh: boolean,
  ): Promise<EmployeeSpecialty[]> {
    if (specialties.length === 0) {
      return []
    }
    if (!isClinical) {
      throw new InvalidRequestError(
        'specialties_not_allowed',
        'Only clinical employees have specialties.',
      )
    }
    const keys = specialties.map(
      ({ coding }) => `${coding.system}|${coding.code}`,
    )
    if (
      specialties.length > MAX_SPECIALTIES ||
      new Set(keys).size !== keys.length ||
      specialties.some(
        ({ coding }) => !SYSTEMS.specialty.test(coding.system),
      ) ||
      specialties.filter(({ is_primary }) => is_primary === true).length !== 1
    ) {
      throw new InvalidRequestError(
        'invalid_specialties',
        'Give at most 10 different specialties from a specialty code system, with exactly one primary.',
      )
    }
    if (fresh) {
      for (const { coding } of specialties) {
        await this.concepts.assertActive(tenantId, coding)
      }
    }
    return specialties.map(({ coding, is_primary }) => ({
      coding: { system: coding.system, code: coding.code },
      is_primary: is_primary === true,
    }))
  }

  /**
   * Checks the clinical level: clinical employees only, from a clinical-level system, active when
   * newly sent (HR plan E7).
   *
   * @param tenantId - Tenant of the caller.
   * @param level - The level, or `null`.
   * @param isClinical - Whether the category is clinical.
   * @param fresh - Whether the request sent the level.
   * @returns The cleaned level, or `null`.
   */
  private async checkLevel(
    tenantId: string,
    level: Coding | null,
    isClinical: boolean,
    fresh: boolean,
  ): Promise<Coding | null> {
    if (level === null) {
      return null
    }
    if (!isClinical) {
      throw new InvalidRequestError(
        'clinical_level_not_allowed',
        'Only clinical employees have a clinical level.',
      )
    }
    if (!SYSTEMS.level.test(level.system)) {
      throw new InvalidRequestError(
        'invalid_clinical_level',
        'The level must come from a clinical-level code system.',
      )
    }
    if (fresh) {
      await this.concepts.assertActive(tenantId, level)
    }
    return { system: level.system, code: level.code }
  }

  /**
   * Checks the official name and builds it with the `official` use.
   *
   * @param input - Name as sent.
   * @returns The cleaned name.
   * @throws InvalidRequestError `invalid_name`.
   */
  private checkName(input: NameInput): HumanName {
    const name = normalizeName(input, 'official')
    if (!name) {
      throw new InvalidRequestError(
        'invalid_name',
        'The name needs text up to 200 characters; family, given names and titles have limits too.',
      )
    }
    return name
  }

  /**
   * Checks the other names.
   *
   * @param inputs - Names as sent.
   * @returns The cleaned names.
   * @throws InvalidRequestError `invalid_other_names`.
   */
  private checkOtherNames(inputs: NameInput[]): HumanName[] {
    const names = normalizeOtherNames(inputs)
    if (!names) {
      throw new InvalidRequestError(
        'invalid_other_names',
        'Give at most 5 other names, each usual, maiden or alias.',
      )
    }
    return names
  }

  /**
   * Checks the administrative gender and builds its code.
   *
   * @param gender - Gender as sent, or `null`.
   * @returns The coding, or `null`.
   * @throws InvalidRequestError `invalid_gender`.
   */
  private checkGender(gender: GenderCode | null): Coding | null {
    if (gender === null) {
      return null
    }
    if (!GENDER_CODES.includes(gender)) {
      throw new InvalidRequestError(
        'invalid_gender',
        'The gender must be male, female, other or unknown.',
      )
    }
    return { system: GENDER_SYSTEM, code: gender }
  }

  /**
   * Checks the hire date (HR plan E14).
   *
   * @param date - Date as sent.
   * @returns The date.
   * @throws InvalidRequestError `invalid_hire_date`.
   */
  private checkHireDate(date: string): string {
    const latest = todayUtc(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000))
    if (
      !isLocalDate(date) ||
      compareLocalDates(date, EARLIEST_HIRE_DATE) < 0 ||
      compareLocalDates(date, latest) > 0
    ) {
      throw new InvalidRequestError(
        'invalid_hire_date',
        'The hire date must be a date from 1950-01-01 to one year ahead.',
      )
    }
    return date
  }

  /**
   * Checks the public registry numbers.
   *
   * @param items - Identifiers as sent.
   * @returns The cleaned identifiers.
   * @throws InvalidRequestError `invalid_practitioner_ids`.
   */
  private checkPractitionerIds(items: ExternalId[]): ExternalId[] {
    const cleaned = normalizeExternalIds(items)
    if (!cleaned) {
      throw new InvalidRequestError(
        'invalid_practitioner_ids',
        'Practitioner ids need a system and a value each, at most 20, with no repeated system.',
      )
    }
    return cleaned
  }

  /**
   * Checks the work contacts.
   *
   * @param inputs - Contacts as sent.
   * @returns The cleaned contacts.
   * @throws InvalidRequestError `invalid_contacts`.
   */
  private checkContacts(inputs: ContactInput[]): ContactPoint[] {
    const contacts = normalizeWorkContacts(inputs)
    if (!contacts) {
      throw new InvalidRequestError(
        'invalid_contacts',
        'Give at most 5 work contacts: phones as +62..., emails as name@domain, one primary per kind.',
      )
    }
    return contacts
  }

  /**
   * Checks the preferred language.
   *
   * @param language - Language as sent, or `null`.
   * @returns The language, or `null`.
   * @throws InvalidRequestError `invalid_language`.
   */
  private checkLanguage(language: string | null): string | null {
    if (language === null) {
      return null
    }
    if (!LANGUAGE_PATTERN.test(language)) {
      throw new InvalidRequestError(
        'invalid_language',
        'The language must be a BCP 47 tag like id-ID.',
      )
    }
    return language
  }

  /**
   * Checks that no other employee of the tenant holds one of the registry numbers (HR plan E8).
   *
   * @param tenantId - Tenant of the caller.
   * @param items - Registry numbers to check.
   * @param ownId - Employee being edited, whose own numbers are fine, or `null`.
   * @throws ConflictError `practitioner_id_taken`.
   */
  private async assertPractitionerIdsFree(
    tenantId: string,
    items: ExternalId[],
    ownId: string | null,
  ): Promise<void> {
    for (const { system, value } of items) {
      const holder = await this.employees.findByPractitionerId(
        tenantId,
        system,
        value,
      )
      if (holder && holder.id !== ownId) {
        throw this.practitionerTaken()
      }
    }
  }

  /**
   * @returns The rejection for a taken employee number.
   */
  private exists(): ConflictError {
    return new ConflictError(
      'employee_exists',
      'An employee with this number already exists.',
    )
  }

  /**
   * @returns The rejection for a registry number that another employee holds.
   */
  private practitionerTaken(): ConflictError {
    return new ConflictError(
      'practitioner_id_taken',
      'Another employee already holds one of these practitioner ids.',
    )
  }

  /**
   * @returns The rejection for an employee that is not in the caller's tenant.
   */
  private notFound(): NotFoundError {
    return new NotFoundError(
      'employee_not_found',
      'The employee was not found.',
    )
  }
}
