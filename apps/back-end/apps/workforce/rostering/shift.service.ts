import { Inject, Injectable } from '@nestjs/common'
import {
  RepositoryConflictError,
  RepositoryNotFoundError,
} from '@utility/database/error'
import { withChangeReason } from '@utility/history/reason'
import { AppLogger } from '@utility/logger/service'
import { type FacilityRepository } from '@repository/interface/facility'
import { type OrganizationUnitRepository } from '@repository/interface/organization-unit'
import {
  type ShiftDefinitionRepository,
  type ShiftQuery,
} from '@repository/interface/shift-definition'
import { type LocalizedText } from '@repository/model/common/localized-text'
import {
  type ShiftDefinition,
  type ShiftType,
} from '@repository/model/shift-definition'
import {
  REPOSITORY_FACILITY,
  REPOSITORY_ORGANIZATION_UNIT,
  REPOSITORY_SHIFT_DEFINITION,
} from '@repository/token'
import { observe } from '../observe'
import { normalizeLocalizedTexts } from '../structure/localized-texts'
import {
  ConflictError,
  InvalidRequestError,
  NotFoundError,
} from '../workforce.error'
import {
  LIMITS,
  normalizeShiftCode,
  parseLocalTime,
  shiftMinutes,
} from './shift-rules'

const NAME = 'ShiftService'

/**
 * Limits of the name of a shift.
 */
const NAME_LIMITS = { maxItems: 10, maxLength: 200 }

/**
 * The kinds of shift.
 */
const TYPES: readonly string[] = [
  'regular',
  'on_call_onsite',
  'on_call_remote',
  'off',
]

/**
 * The fields of a shift that an edit can change, as they will be stored.
 *
 * @property name - Name per language.
 * @property startTime - Local start `HH:mm`, or `null` for an off shift.
 * @property endTime - Local end `HH:mm`, or `null` for an off shift.
 * @property paidMinutes - Working time counted.
 * @property isNight - Counts toward the consecutive-night limit.
 * @property unitIds - Units that may use it; empty means all.
 */
interface ShiftFields {
  name: LocalizedText[]
  startTime: string | null | undefined
  endTime: string | null | undefined
  paidMinutes: number | undefined
  isNight: boolean | undefined
  unitIds: string[]
}

/**
 * Data of a new shift.
 *
 * @property facilityId - Facility that defines the shift.
 * @property code - Shift code, for example `M`.
 * @property name - Name per language.
 * @property type - Kind of shift.
 * @property startTime - Local start `HH:mm`; missing for an off shift.
 * @property endTime - Local end `HH:mm`; missing for an off shift.
 * @property paidMinutes - Working time counted; defaults to 0 except for a regular shift.
 * @property isNight - Whether it is a night shift; defaults to false.
 * @property unitIds - Units that may use it; empty or missing means all.
 * @property reason - Why, kept in the change history.
 */
export interface CreateShiftInput {
  facilityId: string
  code: string
  name: LocalizedText[]
  type: ShiftType
  startTime?: string | null
  endTime?: string | null
  paidMinutes?: number
  isNight?: boolean
  unitIds?: string[]
  reason?: string
}

/**
 * Fields of an edit; each is optional and a field that is sent replaces the old value.
 *
 * @property name - New name per language.
 * @property startTime - New local start.
 * @property endTime - New local end.
 * @property paidMinutes - New paid minutes.
 * @property isNight - New night flag.
 * @property unitIds - New list of units; empty means all.
 * @property version - Version the caller read.
 * @property reason - Why, kept in the change history.
 */
export interface UpdateShiftInput {
  name?: LocalizedText[]
  startTime?: string | null
  endTime?: string | null
  paidMinutes?: number
  isNight?: boolean
  unitIds?: string[]
  version?: number
  reason?: string
}

/**
 * Data of a retirement.
 *
 * @property version - Version the caller read.
 * @property reason - Why, kept in the change history.
 */
export interface RetireShiftInput {
  version?: number
  reason?: string
}

/**
 * The shift definitions of a tenant (HR plan 5.1): list, define, edit and retire. Never deletes;
 * the facility, the code and the type are fixed after creation.
 */
@Injectable()
export class ShiftService {
  /**
   * @param shifts - Shift definition repository.
   * @param facilities - Facility repository.
   * @param units - Organization unit repository.
   * @param logger - Logger of this service.
   */
  constructor(
    @Inject(REPOSITORY_SHIFT_DEFINITION)
    private readonly shifts: ShiftDefinitionRepository,
    @Inject(REPOSITORY_FACILITY)
    private readonly facilities: FacilityRepository,
    @Inject(REPOSITORY_ORGANIZATION_UNIT)
    private readonly units: OrganizationUnitRepository,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * Lists shifts ordered by facility and code. Writes no log entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param query - Optional filters and paging; `unitId` keeps the shifts that unit may use.
   * @returns The shifts.
   */
  list(
    tenantId: string,
    query: Omit<ShiftQuery, 'allowsUnitId'> & { unitId?: string },
  ): Promise<ShiftDefinition[]> {
    const { unitId, ...rest } = query
    return this.shifts.findByFilter(tenantId, {
      ...rest,
      ...(unitId === undefined ? {} : { allowsUnitId: unitId }),
    })
  }

  /**
   * Defines a shift (HR plan 5.1 SH1 to SH7).
   *
   * @param tenantId - Tenant of the caller.
   * @param input - The shift.
   * @returns The created shift.
   * @throws InvalidRequestError `invalid_type`, `invalid_code`, `facility_not_found`,
   * `facility_inactive`, `invalid_name`, `invalid_times`, `invalid_paid`, `paid_required`,
   * `paid_exceeds_duration`, `night_not_allowed`, `invalid_units`, `duplicate_unit`,
   * `unit_not_found`, `unit_closed` or `unit_outside_facility`.
   * @throws ConflictError `shift_exists`.
   */
  create(tenantId: string, input: CreateShiftInput): Promise<ShiftDefinition> {
    return observe(
      this.logger,
      'shift_create',
      `${NAME}.create`,
      async () => {
        if (!TYPES.includes(input.type)) {
          throw new InvalidRequestError(
            'invalid_type',
            'The type must be regular, on_call_onsite, on_call_remote or off.',
          )
        }
        const code = normalizeShiftCode(input.code ?? '')
        if (code === null) {
          throw new InvalidRequestError(
            'invalid_code',
            'The code must have 1 to 8 letters or digits, for example P or ND.',
          )
        }
        await this.facility(tenantId, input.facilityId)
        const fields = await this.check(tenantId, input.facilityId, input.type, {
          name: input.name,
          startTime: input.startTime,
          endTime: input.endTime,
          paidMinutes: input.paidMinutes,
          isNight: input.isNight,
          unitIds: input.unitIds ?? [],
        })
        if (await this.shifts.findByCode(tenantId, input.facilityId, code)) {
          throw this.exists()
        }
        const write = (): Promise<ShiftDefinition> =>
          this.shifts.create({
            tenant_id: tenantId,
            facility_id: input.facilityId,
            code,
            type: input.type,
            ...this.toStored(fields),
            status: 'active',
          })
        try {
          return await (input.reason
            ? withChangeReason(input.reason, write)
            : write())
        } catch (error: unknown) {
          // Two requests with the same code at once: the unique index decided.
          throw error instanceof RepositoryConflictError ? this.exists() : error
        }
      },
    )
  }

  /**
   * Edits an active shift. Fields that are not sent stay as they are, and the shift is checked
   * again as a whole (HR plan 5.1 SH8); the units are checked again only when they are sent, so a
   * unit that closed since does not block an unrelated edit.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Shift identifier.
   * @param input - Fields to change, optional version and reason.
   * @returns The updated shift.
   * @throws NotFoundError `shift_not_found`.
   * @throws InvalidRequestError `empty_update`, `shift_retired` and the codes of `check`.
   * @throws ConflictError `stale_version`.
   */
  update(
    tenantId: string,
    id: string,
    input: UpdateShiftInput,
  ): Promise<ShiftDefinition> {
    return observe(
      this.logger,
      'shift_update',
      `${NAME}.update`,
      async () => {
        const shift = await this.loadActive(tenantId, id)
        const sent = [
          input.name,
          input.startTime,
          input.endTime,
          input.paidMinutes,
          input.isNight,
          input.unitIds,
        ]
        if (sent.every((value) => value === undefined)) {
          throw new InvalidRequestError(
            'empty_update',
            'Send at least one field to change.',
          )
        }
        const fields = await this.check(
          tenantId,
          shift.facility_id,
          shift.type,
          {
            name: input.name ?? shift.name,
            startTime:
              input.startTime === undefined ? shift.start_time : input.startTime,
            endTime: input.endTime === undefined ? shift.end_time : input.endTime,
            paidMinutes: input.paidMinutes ?? shift.paid_minutes,
            isNight: input.isNight ?? shift.is_night,
            unitIds: input.unitIds ?? shift.unit_ids,
          },
          input.unitIds !== undefined,
        )
        this.assertVersion(shift, input.version)
        return this.write(input.reason, () =>
          this.shifts.update(shift.id, this.toStored(fields), {
            expectedVersion: input.version,
          }),
        )
      },
    )
  }

  /**
   * Stops a shift from being assigned. Final: there is no way back (HR plan 5.1 SH9).
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Shift identifier.
   * @param input - Optional version and reason.
   * @returns The retired shift.
   * @throws NotFoundError `shift_not_found`.
   * @throws InvalidRequestError `shift_retired`.
   * @throws ConflictError `stale_version`.
   */
  retire(
    tenantId: string,
    id: string,
    input: RetireShiftInput,
  ): Promise<ShiftDefinition> {
    return observe(
      this.logger,
      'shift_retire',
      `${NAME}.retire`,
      async () => {
        const shift = await this.loadActive(tenantId, id)
        this.assertVersion(shift, input.version)
        return this.write(input.reason, () =>
          this.shifts.update(
            shift.id,
            { status: 'retired' },
            { expectedVersion: input.version },
          ),
        )
      },
    )
  }

  /**
   * Checks the editable fields of a shift and cleans them (HR plan 5.1 SH3 to SH7).
   *
   * @param tenantId - Tenant of the caller.
   * @param facilityId - Facility of the shift.
   * @param type - Kind of shift, fixed.
   * @param fields - The fields as they will be stored.
   * @param checkUnits - Whether to check the units; false keeps the stored units as they are.
   * @returns The cleaned fields with the minutes and the night flag settled.
   * @throws InvalidRequestError `invalid_name`, `invalid_times`, `invalid_paid`, `paid_required`,
   * `paid_exceeds_duration`, `night_not_allowed`, `invalid_units`, `duplicate_unit`,
   * `unit_not_found`, `unit_closed` or `unit_outside_facility`.
   */
  private async check(
    tenantId: string,
    facilityId: string,
    type: ShiftType,
    fields: ShiftFields,
    checkUnits = true,
  ): Promise<{
    name: LocalizedText[]
    startTime: string | null
    endTime: string | null
    paidMinutes: number
    isNight: boolean
    unitIds: string[]
  }> {
    const name = normalizeLocalizedTexts(fields.name ?? [], NAME_LIMITS)
    if (name === null) {
      throw new InvalidRequestError(
        'invalid_name',
        'The name needs 1 to 10 texts of 1 to 200 characters, one per language.',
      )
    }
    const times = this.checkTimes(type, fields)
    const paidMinutes = this.checkPaid(type, fields.paidMinutes, times.minutes)
    const isNight = fields.isNight ?? false
    if (type === 'off' && isNight) {
      throw new InvalidRequestError(
        'night_not_allowed',
        'A day off is not a night shift.',
      )
    }
    if (checkUnits) {
      await this.checkUnits(tenantId, facilityId, fields.unitIds)
    }
    return {
      name,
      startTime: times.start,
      endTime: times.end,
      paidMinutes,
      isNight,
      unitIds: fields.unitIds,
    }
  }

  /**
   * Checks the times of a shift: none for `off`, otherwise two different `HH:mm` times.
   *
   * @param type - Kind of shift.
   * @param fields - The fields as sent.
   * @returns The cleaned times and the length of the shift in minutes (0 for `off`).
   * @throws InvalidRequestError `invalid_times`.
   */
  private checkTimes(
    type: ShiftType,
    fields: ShiftFields,
  ): { start: string | null; end: string | null; minutes: number } {
    const hasStart = fields.startTime !== undefined && fields.startTime !== null
    const hasEnd = fields.endTime !== undefined && fields.endTime !== null
    if (type === 'off') {
      if (hasStart || hasEnd) {
        throw new InvalidRequestError(
          'invalid_times',
          'A day off has no start or end time.',
        )
      }
      return { start: null, end: null, minutes: 0 }
    }
    const start = hasStart ? parseLocalTime(fields.startTime as string) : null
    const end = hasEnd ? parseLocalTime(fields.endTime as string) : null
    if (start === null || end === null || start === end) {
      throw new InvalidRequestError(
        'invalid_times',
        'A shift needs a start and a different end time like 07:00; an end earlier than the start means the next day.',
      )
    }
    return {
      start: fields.startTime as string,
      end: fields.endTime as string,
      minutes: shiftMinutes(start, end),
    }
  }

  /**
   * Checks the paid minutes against the length of the shift (HR plan 5.1 SH5).
   *
   * @param type - Kind of shift.
   * @param paid - Paid minutes as sent, or `undefined`.
   * @param minutes - Length of the shift in minutes.
   * @returns The paid minutes to store.
   * @throws InvalidRequestError `invalid_paid`, `paid_required` or `paid_exceeds_duration`.
   */
  private checkPaid(
    type: ShiftType,
    paid: number | undefined,
    minutes: number,
  ): number {
    if (paid !== undefined && (!Number.isInteger(paid) || paid < 0)) {
      throw new InvalidRequestError(
        'invalid_paid',
        'The paid minutes must be a whole number of minutes, 0 or more.',
      )
    }
    if (type === 'off') {
      if (paid !== undefined && paid !== 0) {
        throw new InvalidRequestError(
          'invalid_paid',
          'A day off has no paid minutes.',
        )
      }
      return 0
    }
    if (type === 'regular' && (paid === undefined || paid === 0)) {
      throw new InvalidRequestError(
        'paid_required',
        'A regular shift counts more than 0 paid minutes.',
      )
    }
    if ((paid ?? 0) > minutes) {
      throw new InvalidRequestError(
        'paid_exceeds_duration',
        'The paid minutes cannot be more than the length of the shift.',
      )
    }
    return paid ?? 0
  }

  /**
   * Checks the units of a shift: active units of the tenant in the shift's facility, without
   * repeats (HR plan 5.1 SH7).
   *
   * @param tenantId - Tenant of the caller.
   * @param facilityId - Facility of the shift.
   * @param unitIds - The units as sent.
   * @throws InvalidRequestError `invalid_units`, `duplicate_unit`, `unit_not_found`,
   * `unit_closed` or `unit_outside_facility`.
   */
  private async checkUnits(
    tenantId: string,
    facilityId: string,
    unitIds: string[],
  ): Promise<void> {
    if (unitIds.length > LIMITS.units) {
      throw new InvalidRequestError(
        'invalid_units',
        'A shift can list at most 100 units.',
      )
    }
    if (new Set(unitIds).size !== unitIds.length) {
      throw new InvalidRequestError('duplicate_unit', 'A unit appears twice.')
    }
    for (const unitId of unitIds) {
      const unit = await this.units.findOne(unitId)
      if (!unit || unit.tenant_id !== tenantId || unit.deleted_at) {
        throw new InvalidRequestError(
          'unit_not_found',
          'A listed unit was not found.',
        )
      }
      if (unit.status !== 'active') {
        throw new InvalidRequestError('unit_closed', 'A listed unit is closed.')
      }
      if (unit.facility_id !== facilityId) {
        throw new InvalidRequestError(
          'unit_outside_facility',
          'Every listed unit must belong to the facility of the shift.',
        )
      }
    }
  }

  /**
   * Checks that the facility exists in the tenant and is active (HR plan 5.1 SH1).
   *
   * @param tenantId - Tenant of the caller.
   * @param facilityId - Facility identifier.
   * @throws InvalidRequestError `facility_not_found` or `facility_inactive`.
   */
  private async facility(tenantId: string, facilityId: string): Promise<void> {
    const facility = await this.facilities.findOne(facilityId)
    if (!facility || facility.tenant_id !== tenantId || facility.deleted_at) {
      throw new InvalidRequestError(
        'facility_not_found',
        'The facility was not found.',
      )
    }
    if (facility.status !== 'active') {
      throw new InvalidRequestError(
        'facility_inactive',
        'The facility is not active.',
      )
    }
  }

  /**
   * Turns the checked fields into the stored shape.
   *
   * @param fields - The checked fields.
   * @returns The fields to store.
   */
  private toStored(
    fields: Awaited<ReturnType<ShiftService['check']>>,
  ): Pick<
    ShiftDefinition,
    | 'name'
    | 'start_time'
    | 'end_time'
    | 'paid_minutes'
    | 'is_night'
    | 'unit_ids'
  > {
    return {
      name: fields.name,
      start_time: fields.startTime,
      end_time: fields.endTime,
      paid_minutes: fields.paidMinutes,
      is_night: fields.isNight,
      unit_ids: fields.unitIds,
    }
  }

  /**
   * Loads a shift of the caller's tenant.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Shift identifier.
   * @returns The shift.
   * @throws NotFoundError `shift_not_found`.
   */
  private async load(tenantId: string, id: string): Promise<ShiftDefinition> {
    const shift = await this.shifts.findOne(id)
    if (!shift || shift.tenant_id !== tenantId || shift.deleted_at) {
      throw this.notFound()
    }
    return shift
  }

  /**
   * Loads a shift that is still active.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Shift identifier.
   * @returns The shift.
   * @throws NotFoundError `shift_not_found`.
   * @throws InvalidRequestError `shift_retired`.
   */
  private async loadActive(
    tenantId: string,
    id: string,
  ): Promise<ShiftDefinition> {
    const shift = await this.load(tenantId, id)
    if (shift.status === 'retired') {
      throw new InvalidRequestError(
        'shift_retired',
        'The shift is retired and cannot be changed.',
      )
    }
    return shift
  }

  /**
   * Refuses a stale version before any write.
   *
   * @param shift - The shift as read.
   * @param version - Version the caller read.
   * @throws ConflictError `stale_version`.
   */
  private assertVersion(
    shift: ShiftDefinition,
    version: number | undefined,
  ): void {
    if (version !== undefined && version !== shift.version) {
      throw this.stale()
    }
  }

  /**
   * Runs a repository write, with the change reason when given, and turns repository rejections
   * into workforce errors.
   *
   * @param reason - Optional reason for the change history.
   * @param write - The repository call.
   * @returns What the call returns.
   */
  private async write(
    reason: string | undefined,
    write: () => Promise<ShiftDefinition>,
  ): Promise<ShiftDefinition> {
    try {
      return await (reason ? withChangeReason(reason, write) : write())
    } catch (error: unknown) {
      if (error instanceof RepositoryConflictError) {
        throw this.stale()
      }
      if (error instanceof RepositoryNotFoundError) {
        throw this.notFound()
      }
      throw error
    }
  }

  /**
   * @returns The not-found error for a shift.
   */
  private notFound(): NotFoundError {
    return new NotFoundError('shift_not_found', 'The shift was not found.')
  }

  /**
   * @returns The conflict for a second shift with the same code in a facility.
   */
  private exists(): ConflictError {
    return new ConflictError(
      'shift_exists',
      'A shift with this code already exists in the facility.',
    )
  }

  /**
   * @returns The conflict for a stale version.
   */
  private stale(): ConflictError {
    return new ConflictError(
      'stale_version',
      'The shift was changed by someone else. Reload it and try again.',
    )
  }
}
