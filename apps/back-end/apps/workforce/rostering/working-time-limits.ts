import { type ParameterService } from '../parameter/parameter.service'
import { type WorkingTimeLimits } from './working-time'

/**
 * Reads the working-time limits of the HR parameters at a unit (`MIN_REST_HOURS`,
 * `MAX_WEEKLY_HOURS`, `MAX_OVERTIME_HOURS_WEEK`, `MAX_CONSECUTIVE_NIGHTS`).
 *
 * @param parameters - The HR parameter service.
 * @param tenantId - Tenant of the caller.
 * @param unitId - The unit whose settings apply.
 * @returns The limits.
 */
export async function readWorkingTimeLimits(
  parameters: ParameterService,
  tenantId: string,
  unitId: string,
): Promise<WorkingTimeLimits> {
  const read = async (key: string): Promise<number> =>
    Number((await parameters.resolve(tenantId, { key, unitId })).value)
  return {
    minRestHours: await read('MIN_REST_HOURS'),
    maxWeeklyHours: await read('MAX_WEEKLY_HOURS'),
    maxOvertimeHoursWeek: await read('MAX_OVERTIME_HOURS_WEEK'),
    maxConsecutiveNights: await read('MAX_CONSECUTIVE_NIGHTS'),
  }
}
