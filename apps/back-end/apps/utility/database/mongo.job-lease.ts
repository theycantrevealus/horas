import { Injectable } from '@nestjs/common'
import { InjectModel, Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Model, SchemaTypes, mongo } from 'mongoose'
import { type JobLease } from '@utility/jobs/lease'
import { MONGO_MAIN_CONNECTION } from './constant'
import { translateMongoError } from './mongo.error'

/**
 * Operation name prefix used in errors.
 */
const OPERATION = 'JobLease'

/**
 * MongoDB error code for a duplicate key, raised when two workers upsert the same lease at once.
 */
const DUPLICATE_KEY_CODE = 11000

/**
 * Mongo storage shape of one job lease: one document per job, named by the job. Not business data
 * and not recorded in the change history.
 *
 * @property _id - Job name.
 * @property owner - Worker instance holding the lease.
 * @property expires_at - When the lease ends unless renewed.
 */
@Schema({ collection: 'job_leases', versionKey: false })
export class JobLeaseEntity {
  @Prop({ type: SchemaTypes.String })
  _id!: string

  @Prop({ type: SchemaTypes.String, required: true })
  owner!: string

  @Prop({ type: SchemaTypes.Date, required: true })
  expires_at!: Date
}

/**
 * Mongoose schema of the job lease.
 */
export const JobLeaseSchema = SchemaFactory.createForClass(JobLeaseEntity)

/**
 * Mongo implementation of `JobLease`.
 */
@Injectable()
export class MongoJobLease implements JobLease {
  /**
   * @param model - Lease collection of the main connection.
   */
  constructor(
    @InjectModel(JobLeaseEntity.name, MONGO_MAIN_CONNECTION)
    private readonly model: Model<JobLeaseEntity>,
  ) {}

  /**
   * Takes or renews the lease of a job in one atomic upsert: it succeeds when no lease exists, the
   * caller holds it, or it expired.
   *
   * @param job - Job name.
   * @param owner - Worker instance name.
   * @param leaseMs - Lease duration.
   * @returns `true` when `owner` holds the lease.
   */
  async acquire(job: string, owner: string, leaseMs: number): Promise<boolean> {
    const now = new Date()
    try {
      const lease = await this.model
        .findOneAndUpdate(
          { _id: job, $or: [{ owner }, { expires_at: { $lte: now } }] },
          { $set: { owner, expires_at: new Date(now.getTime() + leaseMs) } },
          { upsert: true, returnDocument: 'after' },
        )
        .lean<JobLeaseEntity>()
        .exec()
      return lease?.owner === owner
    } catch (error: unknown) {
      if (
        error instanceof mongo.MongoServerError &&
        error.code === DUPLICATE_KEY_CODE
      ) {
        return false
      }
      throw translateMongoError(error, `${OPERATION}.acquire`)
    }
  }
}
