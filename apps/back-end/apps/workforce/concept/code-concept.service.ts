import { Inject, Injectable } from '@nestjs/common'
import {
  RepositoryConflictError,
  RepositoryNotFoundError,
} from '@utility/database/error'
import { withChangeReason } from '@utility/history/reason'
import { AppLogger } from '@utility/logger/service'
import { isValidPeriod, todayUtc } from '@utility/validation/local-date'
import { type CodeConceptRepository } from '@repository/interface/code-concept'
import { type CodeConcept } from '@repository/model/code-concept'
import { type DatePeriod } from '@repository/model/common/calendar'
import { type Coding } from '@repository/model/common/coding'
import { type LocalizedText } from '@repository/model/common/localized-text'
import { REPOSITORY_CODE_CONCEPT } from '@repository/token'
import { observe } from '../observe'
import {
  ConflictError,
  InvalidRequestError,
  NotFoundError,
} from '../workforce.error'
import { normalizeLocalizedTexts } from '../structure/localized-texts'
import { findBundle } from './bundles'
import { normalizeProperties } from './properties'
import { satisfiesSystemRules } from './system-rules'

const NAME = 'CodeConceptService'

/**
 * Format of a code system name and of a concept code (HR plan C3).
 */
const SYSTEM_PATTERN = /^[a-z0-9][a-z0-9._-]{1,63}$/
const CODE_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/

/**
 * Most mappings one concept can hold.
 */
const MAX_MAPPINGS = 10

/**
 * Period of use as a caller sends it: `end` may be left out for an open-ended period.
 *
 * @property start - First day, `YYYY-MM-DD`.
 * @property end - Last day, or `null` or missing for open-ended.
 */
export interface PeriodInput {
  start: string
  end?: string | null
}

/**
 * Filters of the concept list.
 *
 * @property system - Code system to list; required.
 * @property status - Only concepts with this status.
 */
export interface ListCodeConceptsInput {
  system: string
  status?: CodeConcept['status']
}

/**
 * Data of a new tenant concept.
 *
 * @property system - Code system, for example `id.license-type`.
 * @property code - Code inside the system.
 * @property display - Text per language.
 * @property properties - Attributes that rules read.
 * @property mappings - Equivalent codes in universal systems.
 * @property period - When the concept may be used, or `null` for always.
 */
export interface CreateCodeConceptInput {
  system: string
  code: string
  display: LocalizedText[]
  properties?: Record<string, unknown>
  mappings?: Coding[]
  period?: PeriodInput | null
}

/**
 * Changes to a tenant concept. `system` and `code` are not here: they cannot change (HR plan C2).
 *
 * @property display - New text per language, replacing the old.
 * @property properties - New properties, replacing the old.
 * @property mappings - New mappings, replacing the old.
 * @property period - New period, or `null` for always.
 * @property status - `retired` to stop new use, `active` to allow it again.
 * @property version - Version the caller read; the edit fails when the record changed since.
 * @property reason - Why the data changes, kept in the change history.
 */
export interface UpdateCodeConceptInput {
  display?: LocalizedText[]
  properties?: Record<string, unknown>
  mappings?: Coding[]
  period?: PeriodInput | null
  status?: CodeConcept['status']
  version?: number
  reason?: string
}

/**
 * Result of importing a bundle.
 *
 * @property bundle - Name of the bundle.
 * @property created - Concepts added.
 * @property skipped - Concepts the tenant already had.
 */
export interface ImportResult {
  bundle: string
  created: number
  skipped: number
}

/**
 * Code concepts: the codes of the code systems that HR rules depend on. A tenant sees its own
 * concepts and the platform-wide ones; a tenant concept replaces a platform concept with the
 * same system and code. Concepts are never deleted, only retired.
 */
@Injectable()
export class CodeConceptService {
  /**
   * @param concepts - Code concept repository.
   * @param logger - Logger of this service.
   */
  constructor(
    @Inject(REPOSITORY_CODE_CONCEPT)
    private readonly concepts: CodeConceptRepository,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * Lists the concepts of one system as the tenant sees them, ordered by code: where the tenant
   * has its own concept for a code, that one replaces the platform-wide concept. The status filter
   * applies to the concept that is shown. Writes no log entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param input - System and optional status.
   * @returns The concepts, possibly none.
   */
  async list(
    tenantId: string,
    input: ListCodeConceptsInput,
  ): Promise<CodeConcept[]> {
    const effective = new Map<string, CodeConcept>()
    for (const concept of await this.concepts.findBySystem(
      tenantId,
      input.system,
    )) {
      const known = effective.get(concept.code)
      if (!known || (concept.tenant_id && !known.tenant_id)) {
        effective.set(concept.code, concept)
      }
    }
    return [...effective.values()]
      .filter((concept) => !input.status || concept.status === input.status)
      .sort((left, right) => left.code.localeCompare(right.code))
  }

  /**
   * Finds the concept a tenant sees for a code, whatever its status. Writes no log entry.
   *
   * @param tenantId - Tenant of the caller.
   * @param system - Code system.
   * @param code - Code inside the system.
   * @returns The concept, or `null`.
   */
  resolve(
    tenantId: string,
    system: string,
    code: string,
  ): Promise<CodeConcept | null> {
    return this.concepts.findByCode(tenantId, system, code)
  }

  /**
   * Checks that a code can be used on a new record: the concept exists, is active and its period
   * covers the date. Other HR services call it for every `Coding` they store. Writes no log entry.
   *
   * @param tenantId - Tenant of the caller.
   * @param coding - The code to check.
   * @param on - Date the code is used on, as a local date; today in UTC when omitted.
   * @returns The concept.
   * @throws InvalidRequestError `unknown_code`, `code_retired` or `code_not_in_period`.
   */
  async assertActive(
    tenantId: string,
    coding: Coding,
    on: string = todayUtc(),
  ): Promise<CodeConcept> {
    const concept = await this.concepts.findByCode(
      tenantId,
      coding.system,
      coding.code,
    )
    if (!concept) {
      throw new InvalidRequestError('unknown_code', 'The code is not known.')
    }
    if (concept.status !== 'active') {
      throw new InvalidRequestError(
        'code_retired',
        'The code is retired and cannot be used on new records.',
      )
    }
    if (
      concept.period &&
      (on < concept.period.start ||
        (concept.period.end && on > concept.period.end))
    ) {
      throw new InvalidRequestError(
        'code_not_in_period',
        'The code cannot be used on this date.',
      )
    }
    return concept
  }

  /**
   * Adds a tenant concept, active. A concept with the code of a platform-wide one becomes the
   * tenant's own version of it.
   *
   * @param tenantId - Tenant of the caller.
   * @param input - The concept.
   * @returns The created concept.
   * @throws InvalidRequestError `invalid_system`, `invalid_code`, `invalid_display`,
   * `invalid_properties`, `invalid_mappings` or `invalid_period`.
   * @throws ConflictError `code_concept_exists` when the tenant already has the code.
   */
  create(
    tenantId: string,
    input: CreateCodeConceptInput,
  ): Promise<CodeConcept> {
    return observe(
      this.logger,
      'code_concept_create',
      `${NAME}.create`,
      async () => {
        if (!SYSTEM_PATTERN.test(input.system)) {
          throw new InvalidRequestError(
            'invalid_system',
            'The system must have 2 to 64 lower-case letters, digits, dots, hyphens or underscores.',
          )
        }
        if (!CODE_PATTERN.test(input.code)) {
          throw new InvalidRequestError(
            'invalid_code',
            'The code must have 1 to 64 lower-case letters, digits, dots, hyphens or underscores.',
          )
        }
        const display = this.checkDisplay(input.display)
        const properties = this.checkProperties(
          input.system,
          input.properties ?? {},
        )
        const mappings = this.checkMappings(input.mappings ?? [])
        const period = this.checkPeriod(input.period ?? null)
        if (await this.concepts.findOwn(tenantId, input.system, input.code)) {
          throw this.exists()
        }
        try {
          return await this.concepts.create({
            tenant_id: tenantId,
            system: input.system,
            code: input.code,
            display,
            properties,
            mappings,
            period,
            status: 'active',
          })
        } catch (error: unknown) {
          // Two requests with the same code at once: the unique index decides.
          throw error instanceof RepositoryConflictError ? this.exists() : error
        }
      },
    )
  }

  /**
   * Changes the display text, properties, mappings, period or status of a tenant concept.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Concept identifier.
   * @param input - Fields to change.
   * @returns The updated concept.
   * @throws InvalidRequestError `empty_update`, `invalid_display`, `invalid_properties`,
   * `invalid_mappings` or `invalid_period`.
   * @throws NotFoundError `code_concept_not_found`, also for platform-wide concepts.
   * @throws ConflictError `stale_version` when `version` is given and the record changed since.
   */
  update(
    tenantId: string,
    id: string,
    input: UpdateCodeConceptInput,
  ): Promise<CodeConcept> {
    return observe(
      this.logger,
      'code_concept_update',
      `${NAME}.update`,
      async () => {
        const concept = await this.load(tenantId, id)
        const changes: Partial<
          Pick<
            CodeConcept,
            'display' | 'properties' | 'mappings' | 'period' | 'status'
          >
        > = {}
        if (input.display !== undefined) {
          changes.display = this.checkDisplay(input.display)
        }
        if (input.properties !== undefined) {
          changes.properties = this.checkProperties(
            concept.system,
            input.properties,
          )
        }
        if (input.mappings !== undefined) {
          changes.mappings = this.checkMappings(input.mappings)
        }
        if (input.period !== undefined) {
          changes.period = this.checkPeriod(input.period)
        }
        if (input.status !== undefined) {
          changes.status = input.status
        }
        if (Object.keys(changes).length === 0) {
          throw new InvalidRequestError(
            'empty_update',
            'Send at least one field to change.',
          )
        }
        const write = () =>
          this.concepts.update(concept.id, changes, {
            expectedVersion: input.version,
          })
        try {
          return await (input.reason
            ? withChangeReason(input.reason, write)
            : write())
        } catch (error: unknown) {
          if (error instanceof RepositoryConflictError) {
            throw new ConflictError(
              'stale_version',
              'The code concept was changed by someone else. Reload it and try again.',
            )
          }
          if (error instanceof RepositoryNotFoundError) {
            throw this.notFound()
          }
          throw error
        }
      },
    )
  }

  /**
   * Copies a ready-made bundle into the tenant. Concepts the tenant already has are skipped and
   * never overwritten, so importing twice changes nothing and an edit survives a re-import.
   *
   * @param tenantId - Tenant of the caller.
   * @param bundle - Bundle name, for example `id`.
   * @returns How many concepts were added and skipped.
   * @throws InvalidRequestError `unknown_bundle`.
   */
  import(tenantId: string, bundle: string): Promise<ImportResult> {
    return observe(
      this.logger,
      'code_concept_import',
      `${NAME}.import`,
      async () => {
        const concepts = findBundle(bundle)
        if (!concepts) {
          throw new InvalidRequestError(
            'unknown_bundle',
            'There is no bundle with this name.',
          )
        }
        let created = 0
        let skipped = 0
        // One after another: a transaction session does not allow parallel operations.
        for (const concept of concepts) {
          if (
            await this.concepts.findOwn(tenantId, concept.system, concept.code)
          ) {
            skipped += 1
            continue
          }
          try {
            await this.concepts.create({
              tenant_id: tenantId,
              system: concept.system,
              code: concept.code,
              display: concept.display.map((text) => ({ ...text })),
              properties: { ...concept.properties },
              mappings: concept.mappings.map((mapping) => ({ ...mapping })),
              period: null,
              status: 'active',
            })
            created += 1
          } catch (error: unknown) {
            // Another import created it at the same moment.
            if (!(error instanceof RepositoryConflictError)) {
              throw error
            }
            skipped += 1
          }
        }
        return { bundle, created, skipped }
      },
      'log',
      ({ created, skipped }) => ({ created, skipped }),
    )
  }

  /**
   * Loads a concept the tenant owns. A platform-wide concept is not the tenant's and answers
   * not found (HR plan C9).
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Concept identifier.
   * @returns The concept.
   * @throws NotFoundError `code_concept_not_found`.
   */
  private async load(tenantId: string, id: string): Promise<CodeConcept> {
    const concept = await this.concepts.findOne(id)
    if (!concept || concept.tenant_id !== tenantId) {
      throw this.notFound()
    }
    return concept
  }

  /**
   * Checks the display text (HR plan C4).
   *
   * @param display - Text as sent.
   * @returns The cleaned text.
   * @throws InvalidRequestError `invalid_display`.
   */
  private checkDisplay(display: LocalizedText[]): LocalizedText[] {
    const cleaned = normalizeLocalizedTexts(display, {
      maxItems: 10,
      maxLength: 200,
    })
    if (!cleaned) {
      throw new InvalidRequestError(
        'invalid_display',
        'Give 1 to 10 texts, each with a language tag and up to 200 characters, one per language.',
      )
    }
    return cleaned
  }

  /**
   * Checks the properties: the shape (HR plan C5) and the rules of the system (C6).
   *
   * @param system - Code system of the concept.
   * @param properties - Properties as sent.
   * @returns The properties.
   * @throws InvalidRequestError `invalid_properties`.
   */
  private checkProperties(
    system: string,
    properties: Record<string, unknown>,
  ): Record<string, unknown> {
    const shaped = normalizeProperties(properties)
    if (!shaped || !satisfiesSystemRules(system, shaped)) {
      throw new InvalidRequestError(
        'invalid_properties',
        'The properties are not valid for this code system.',
      )
    }
    return shaped
  }

  /**
   * Checks the mappings: at most 10, text of 1 to 64 characters, no pair twice.
   *
   * @param mappings - Mappings as sent.
   * @returns The cleaned mappings.
   * @throws InvalidRequestError `invalid_mappings`.
   */
  private checkMappings(mappings: Coding[]): Coding[] {
    const cleaned = mappings.map(({ system, code }) => ({
      system: system.trim(),
      code: code.trim(),
    }))
    const pairs = new Set(
      cleaned.map(({ system, code }) => `${system}\u0000${code}`),
    )
    if (
      cleaned.length > MAX_MAPPINGS ||
      pairs.size !== cleaned.length ||
      cleaned.some(
        ({ system, code }) =>
          !system || system.length > 64 || !code || code.length > 64,
      )
    ) {
      throw new InvalidRequestError(
        'invalid_mappings',
        'Give at most 10 different mappings, each with a system and code of up to 64 characters.',
      )
    }
    return cleaned
  }

  /**
   * Checks the period of use (HR plan C7).
   *
   * @param period - Period as sent, or `null` for always.
   * @returns The period.
   * @throws InvalidRequestError `invalid_period`.
   */
  private checkPeriod(period: PeriodInput | null): DatePeriod | null {
    if (period === null) {
      return null
    }
    const normalized = { start: period.start, end: period.end ?? null }
    if (!isValidPeriod(normalized)) {
      throw new InvalidRequestError(
        'invalid_period',
        'The period needs real dates like 2026-01-31, and the end cannot be before the start.',
      )
    }
    return normalized
  }

  /**
   * @returns The rejection for a taken code.
   */
  private exists(): ConflictError {
    return new ConflictError(
      'code_concept_exists',
      'The tenant already has a concept with this system and code.',
    )
  }

  /**
   * @returns The rejection for a concept that is not the tenant's.
   */
  private notFound(): NotFoundError {
    return new NotFoundError(
      'code_concept_not_found',
      'The code concept was not found.',
    )
  }
}
