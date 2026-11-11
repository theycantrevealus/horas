import { Inject, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import { RepositoryConflictError } from '@utility/database/error'
import { type UpdateOptions } from '@utility/database/interface'
import { translateMongoError } from '@utility/database/mongo.error'
import { toObjectId } from '@utility/database/mongo.query'
import {
  TRANSACTION_MANAGER,
  type TransactionManager,
} from '@utility/database/transaction'
import { CHANGE_RECORDER, type ChangeRecorder } from '@utility/history/recorder'
import { type OrganizationUnitRepository } from '@repository/interface/organization-unit'
import { OrganizationUnit } from '@repository/model/organization-unit'
import { OrganizationUnitClassification } from '@repository/model/organization-unit.classification'
import { LeanRecord, MongoRepositoryBase } from './base'
import { OrganizationUnitEntity } from './schema/organization-unit'

/**
 * Mongo implementation of `OrganizationUnitRepository`. Units are never deleted, only closed.
 * `facility_id`, `organization_id`, `code`, `parent_id` and `ancestor_ids` cannot be changed through
 * `update`: the parent and the ancestors change only through `moveSubtree`, which keeps the whole
 * subtree consistent. `period` and `status` are updatable because closing a unit sets them.
 */
@Injectable()
export class OrganizationUnitRepositoryMongo
  extends MongoRepositoryBase<OrganizationUnit, OrganizationUnitEntity>
  implements OrganizationUnitRepository
{
  /**
   * @param unitModel - Mongoose model of the `organization_units` collection.
   * @param transactions - Transaction manager of the main connection.
   * @param changes - Records every write in the change history.
   */
  constructor(
    @InjectModel(OrganizationUnitEntity.name, MONGO_MAIN_CONNECTION)
    unitModel: Model<OrganizationUnitEntity>,
    @Inject(TRANSACTION_MANAGER) transactions: TransactionManager,
    @Inject(CHANGE_RECORDER) changes: ChangeRecorder,
  ) {
    super(unitModel, transactions, changes, {
      name: 'OrganizationUnitRepository',
      entityType: 'organization_unit',
      classification: OrganizationUnitClassification,
      allowUpdate: true,
      allowDelete: false,
      allowSoftDelete: false,
      updatableFields: [
        'name',
        'type',
        'is_clinical',
        'external_ids',
        'period',
        'status',
      ],
    })
  }

  /**
   * Finds a unit by its code inside a facility.
   *
   * @param tenantId - Tenant to search in.
   * @param facilityId - Facility the unit belongs to.
   * @param code - Unit code, unique inside the facility.
   * @returns The unit, or `null` when none matches.
   */
  async findByCode(
    tenantId: string,
    facilityId: string,
    code: string,
  ): Promise<OrganizationUnit | null> {
    const operation = 'OrganizationUnitRepository.findByCode'
    if (!toObjectId(tenantId) || !toObjectId(facilityId)) {
      return null
    }
    try {
      const record = await this.model
        .findOne(
          this.toFilter({
            tenant_id: tenantId,
            facility_id: facilityId,
            code,
            deleted_at: null,
          }),
        )
        .lean<LeanRecord<OrganizationUnitEntity>>()
        .exec()
      return record ? this.toModel(record) : null
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Finds the units whose parent is the given unit, ordered by code.
   *
   * @param tenantId - Tenant to search in.
   * @param parentId - Parent unit.
   * @returns The direct children, possibly none.
   */
  findChildren(
    tenantId: string,
    parentId: string,
  ): Promise<OrganizationUnit[]> {
    return this.findMany('findChildren', [tenantId, parentId], {
      tenant_id: tenantId,
      parent_id: parentId,
    })
  }

  /**
   * Finds every unit below a unit, at any depth, ordered by code.
   *
   * @param tenantId - Tenant to search in.
   * @param unitId - Unit whose subtree is read.
   * @returns The descendants, possibly none.
   */
  findDescendants(
    tenantId: string,
    unitId: string,
  ): Promise<OrganizationUnit[]> {
    return this.findMany('findDescendants', [tenantId, unitId], {
      tenant_id: tenantId,
      ancestor_ids: unitId,
    })
  }

  /**
   * Finds the units of a facility, whatever their status, ordered by code.
   *
   * @param tenantId - Tenant to search in.
   * @param facilityId - Facility the units belong to.
   * @param limit - Most units to return; omit for all.
   * @returns The units, possibly none.
   */
  findByFacility(
    tenantId: string,
    facilityId: string,
    limit?: number,
  ): Promise<OrganizationUnit[]> {
    return this.findMany(
      'findByFacility',
      [tenantId, facilityId],
      { tenant_id: tenantId, facility_id: facilityId },
      limit,
    )
  }

  /**
   * Finds the active units of a facility, ordered by code.
   *
   * @param tenantId - Tenant to search in.
   * @param facilityId - Facility the units belong to.
   * @param limit - Most units to return; omit for all.
   * @returns The active units, possibly none.
   */
  findActiveByFacility(
    tenantId: string,
    facilityId: string,
    limit?: number,
  ): Promise<OrganizationUnit[]> {
    return this.findMany(
      'findActiveByFacility',
      [tenantId, facilityId],
      { tenant_id: tenantId, facility_id: facilityId, status: 'active' },
      limit,
    )
  }

  /**
   * Moves a unit with its subtree. Inside one transaction it reads the unit, re-reads the new
   * parent and the subtree, rewrites `parent_id` of the unit and `ancestor_ids` of every unit in
   * the subtree, and records one change entry per unit.
   *
   * @param id - Unit to move.
   * @param newParentId - New parent, or `null` for a top unit.
   * @param options - With `expectedVersion`, rejects when the unit changed since it was read.
   * @returns The moved unit.
   */
  async moveSubtree(
    id: string,
    newParentId: string | null,
    options?: UpdateOptions,
  ): Promise<OrganizationUnit> {
    const operation = 'OrganizationUnitRepository.moveSubtree'
    const objectId = this.requireObjectId(id, operation)
    this.requireActor(operation)
    const parentObjectId =
      newParentId === null ? null : this.requireObjectId(newParentId, operation)
    try {
      return await this.transactions.run(async () => {
        const unit = await this.model
          .findOne(this.toFilter({ _id: objectId, deleted_at: null }))
          .lean<LeanRecord<OrganizationUnitEntity>>()
          .exec()
        if (!unit) {
          throw this.notFound(id, operation)
        }
        if (
          options?.expectedVersion !== undefined &&
          unit.version !== options.expectedVersion
        ) {
          throw this.chartChanged(operation)
        }
        const ancestors = await this.readNewAncestors(
          unit,
          parentObjectId,
          operation,
        )
        const subtree = await this.model
          .find(
            this.toFilter({
              tenant_id: unit.tenant_id,
              ancestor_ids: objectId,
              deleted_at: null,
            }),
          )
          .lean<LeanRecord<OrganizationUnitEntity>[]>()
          .exec()

        // Sequential on purpose: a transaction session does not allow parallel operations.
        const moved = await this.rewrite(
          unit,
          { parent_id: parentObjectId, ancestor_ids: ancestors },
          operation,
          options?.expectedVersion,
        )
        for (const descendant of subtree) {
          const position = descendant.ancestor_ids.findIndex((ancestor) =>
            ancestor.equals(objectId),
          )
          await this.rewrite(
            descendant,
            {
              ancestor_ids: [
                ...ancestors,
                ...descendant.ancestor_ids.slice(position),
              ],
            },
            operation,
          )
        }
        return moved
      })
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Maps a stored record to the model, copying only model fields.
   *
   * @param record - Stored record.
   * @returns The unit.
   */
  protected toModel(
    record: LeanRecord<OrganizationUnitEntity>,
  ): OrganizationUnit {
    return {
      id: record._id.toHexString(),
      tenant_id: record.tenant_id.toHexString(),
      schema_version: record.schema_version,
      version: record.version,
      organization_id: record.organization_id.toHexString(),
      facility_id: record.facility_id.toHexString(),
      code: record.code,
      name: record.name.map(({ locale, text }) => ({ locale, text })),
      type: {
        system: record.type.system,
        code: record.type.code,
        ...(record.type.display === undefined
          ? {}
          : { display: record.type.display }),
      },
      parent_id: record.parent_id ? record.parent_id.toHexString() : null,
      ancestor_ids: record.ancestor_ids.map((ancestor) =>
        ancestor.toHexString(),
      ),
      is_clinical: record.is_clinical,
      external_ids: record.external_ids.map(({ system, value }) => ({
        system,
        value,
      })),
      period: record.period
        ? { start: record.period.start, end: record.period.end }
        : null,
      status: record.status,
      created_by: record.created_by,
      created_at: record.created_at,
      updated_at: record.updated_at,
      deleted_at: record.deleted_at,
    }
  }

  /**
   * Runs a named read: units that match a filter, ordered by code.
   *
   * @param name - Method name for the operation label.
   * @param ids - Identifiers in the filter; a malformed one gives no result.
   * @param filter - Filter on model fields; soft-deleted units are always left out.
   * @param limit - Most units to return.
   * @returns The units.
   */
  private async findMany(
    name: string,
    ids: string[],
    filter: Record<string, unknown>,
    limit?: number,
  ): Promise<OrganizationUnit[]> {
    const operation = `OrganizationUnitRepository.${name}`
    if (ids.some((value) => !toObjectId(value))) {
      return []
    }
    try {
      const query = this.model
        .find(this.toFilter({ ...filter, deleted_at: null }))
        .sort({ code: 1 })
      if (limit !== undefined) {
        query.limit(limit)
      }
      const records = await query
        .lean<LeanRecord<OrganizationUnitEntity>[]>()
        .exec()
      return records.map((record) => this.toModel(record))
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Reads the new parent inside the move transaction and returns the ancestors the moved unit
   * gets. Rejects when the parent no longer fits, so a stale check made before the transaction
   * cannot write a loop.
   *
   * @param unit - The unit being moved, as stored.
   * @param parentId - New parent, or `null`.
   * @param operation - Operation name for errors.
   * @returns The new `ancestor_ids` of the unit.
   * @throws RepositoryConflictError when the parent is missing, in another facility, closed, the
   * unit itself or one of its descendants.
   */
  private async readNewAncestors(
    unit: LeanRecord<OrganizationUnitEntity>,
    parentId: Types.ObjectId | null,
    operation: string,
  ): Promise<Types.ObjectId[]> {
    if (parentId === null) {
      return []
    }
    const parent = await this.model
      .findOne(
        this.toFilter({
          _id: parentId,
          tenant_id: unit.tenant_id,
          facility_id: unit.facility_id,
          status: 'active',
          deleted_at: null,
        }),
      )
      .lean<LeanRecord<OrganizationUnitEntity>>()
      .exec()
    if (
      !parent ||
      parent._id.equals(unit._id) ||
      parent.ancestor_ids.some((ancestor) => ancestor.equals(unit._id))
    ) {
      throw this.chartChanged(operation)
    }
    return [...parent.ancestor_ids, parent._id]
  }

  /**
   * Writes new parent or ancestors of one unit, bumps its version and records the change.
   *
   * @param stored - The unit as stored before the write.
   * @param values - Fields to set.
   * @param operation - Operation name for errors and the change record.
   * @param expectedVersion - Version the caller read, for the moved unit only.
   * @returns The unit after the write.
   */
  private async rewrite(
    stored: LeanRecord<OrganizationUnitEntity>,
    values: {
      parent_id?: Types.ObjectId | null
      ancestor_ids: Types.ObjectId[]
    },
    operation: string,
    expectedVersion?: number,
  ): Promise<OrganizationUnit> {
    const record = await this.model
      .findOneAndUpdate(
        this.toFilter({
          _id: stored._id,
          deleted_at: null,
          ...(expectedVersion === undefined
            ? {}
            : { version: expectedVersion }),
        }),
        { $set: { ...values, updated_at: new Date() }, $inc: { version: 1 } },
        { returnDocument: 'after', runValidators: true },
      )
      .lean<LeanRecord<OrganizationUnitEntity>>()
      .exec()
    if (!record) {
      throw this.chartChanged(operation)
    }
    const after = this.toModel(record)
    await this.record(this.toModel(stored), after, operation)
    return after
  }

  /**
   * Builds the error for a move that no longer fits the chart or a stale version. It holds no values.
   *
   * @param operation - Operation name.
   * @returns The error to throw.
   */
  private chartChanged(operation: string): RepositoryConflictError {
    return new RepositoryConflictError(
      `${operation}: the organization chart changed since it was read`,
      { operation },
    )
  }
}
