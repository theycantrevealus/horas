import { Inject, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import { translateMongoError } from '@utility/database/mongo.error'
import { toObjectId } from '@utility/database/mongo.query'
import {
  TRANSACTION_MANAGER,
  type TransactionManager,
} from '@utility/database/transaction'
import { CHANGE_RECORDER, type ChangeRecorder } from '@utility/history/recorder'
import { type ClinicalAppointmentRepository } from '@repository/interface/clinical-appointment'
import { ClinicalAppointment } from '@repository/model/clinical-appointment'
import { ClinicalAppointmentClassification } from '@repository/model/clinical-appointment.classification'
import { LeanRecord, MongoRepositoryBase } from './base'
import { ClinicalAppointmentEntity } from './schema/clinical-appointment'

/**
 * Mongo implementation of `ClinicalAppointmentRepository`. Appointments are never deleted. Only
 * the status, the current flag, the suspension, the revocation and the supersession change after
 * issue; the practitioner, the facility, the units, the number and the period never do.
 */
@Injectable()
export class ClinicalAppointmentRepositoryMongo
  extends MongoRepositoryBase<ClinicalAppointment, ClinicalAppointmentEntity>
  implements ClinicalAppointmentRepository
{
  /**
   * @param appointmentModel - Mongoose model of the `clinical_appointments` collection.
   * @param transactions - Transaction manager of the main connection.
   * @param changes - Records every write in the change history.
   */
  constructor(
    @InjectModel(ClinicalAppointmentEntity.name, MONGO_MAIN_CONNECTION)
    appointmentModel: Model<ClinicalAppointmentEntity>,
    @Inject(TRANSACTION_MANAGER) transactions: TransactionManager,
    @Inject(CHANGE_RECORDER) changes: ChangeRecorder,
  ) {
    super(appointmentModel, transactions, changes, {
      name: 'ClinicalAppointmentRepository',
      entityType: 'clinical_appointment',
      classification: ClinicalAppointmentClassification,
      allowUpdate: true,
      allowDelete: false,
      allowSoftDelete: false,
      updatableFields: [
        'status',
        'is_current',
        'suspension',
        'revocation',
        'superseded_by_id',
      ],
    })
  }

  /**
   * Finds an appointment by its letter number.
   *
   * @param tenantId - Tenant to search in.
   * @param appointmentNumber - The SPK letter number.
   * @returns The appointment, or `null`.
   */
  async findByNumber(
    tenantId: string,
    appointmentNumber: string,
  ): Promise<ClinicalAppointment | null> {
    return this.findOneWhere(
      'ClinicalAppointmentRepository.findByNumber',
      tenantId,
      [],
      { appointment_number: appointmentNumber },
    )
  }

  /**
   * Finds the current regular appointment of an employee at a credentialing facility.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The practitioner.
   * @param facilityId - The credentialing facility.
   * @returns The appointment, or `null`.
   */
  async findCurrentRegular(
    tenantId: string,
    employeeId: string,
    facilityId: string,
  ): Promise<ClinicalAppointment | null> {
    return this.findOneWhere(
      'ClinicalAppointmentRepository.findCurrentRegular',
      tenantId,
      [employeeId, facilityId],
      {
        employee_id: employeeId,
        credentialing_facility_id: facilityId,
        is_current: true,
        is_temporary: false,
      },
    )
  }

  /**
   * Reads one appointment of a tenant. A malformed identifier matches nothing.
   *
   * @param operation - Operation name for errors.
   * @param tenantId - Tenant to search in.
   * @param ids - Identifiers that must be well formed.
   * @param conditions - Field conditions.
   * @returns The appointment, or `null`.
   */
  private async findOneWhere(
    operation: string,
    tenantId: string,
    ids: string[],
    conditions: Record<string, unknown>,
  ): Promise<ClinicalAppointment | null> {
    if (!toObjectId(tenantId) || ids.some((id) => !toObjectId(id))) {
      return null
    }
    try {
      const record = await this.model
        .findOne(
          this.toFilter({ tenant_id: tenantId, deleted_at: null, ...conditions }),
        )
        .lean<LeanRecord<ClinicalAppointmentEntity>>()
        .exec()
      return record ? this.toModel(record) : null
    } catch (error: unknown) {
      throw translateMongoError(error, operation)
    }
  }

  /**
   * Maps a stored record to the model, copying only model fields.
   *
   * @param record - Stored record.
   * @returns The appointment.
   */
  protected toModel(
    record: LeanRecord<ClinicalAppointmentEntity>,
  ): ClinicalAppointment {
    return {
      id: record._id.toHexString(),
      tenant_id: record.tenant_id.toHexString(),
      schema_version: record.schema_version,
      version: record.version,
      appointment_number: record.appointment_number,
      employee_id: record.employee_id.toHexString(),
      credentialing_facility_id: record.credentialing_facility_id.toHexString(),
      credentialing_scope: record.credentialing_scope,
      facility_ids: record.facility_ids.map((id) => id.toHexString()),
      unit_ids: record.unit_ids.map((id) => id.toHexString()),
      source_application_id: record.source_application_id.toHexString(),
      valid_period: {
        start: record.valid_period.start,
        end: record.valid_period.end as string,
      },
      is_temporary: record.is_temporary,
      status: record.status,
      is_current: record.is_current,
      issued: {
        by: record.issued.by,
        director_employee_id: record.issued.director_employee_id.toHexString(),
        date: record.issued.date,
      },
      signed_document: record.signed_document,
      suspension: record.suspension,
      revocation: record.revocation,
      superseded_by_id: record.superseded_by_id
        ? record.superseded_by_id.toHexString()
        : null,
      created_by: record.created_by,
      created_at: record.created_at,
      updated_at: record.updated_at,
      deleted_at: record.deleted_at,
    }
  }
}
