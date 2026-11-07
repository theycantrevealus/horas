import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common'
import { type LOV } from '@repository/model/lov'
import { RequirePermissions } from '@identity/guard/decorators'
import { PERMISSIONS } from '@identity/permission'
import { GatewayBackOfficeService } from '../gateway.back.office.service'
import { CreateLovDto, UpdateLovDto } from './lov.dto'

/**
 * Lists of values (drop-down options). The reference example of the access guards: reading
 * needs `reference.lov:read`, writing needs `reference.lov:write`, and routes with no
 * `@RequirePermissions` would only need a signed-in caller.
 */
@Controller({ path: 'lov', version: '1' })
export class LovController {
  /**
   * @param gateway - Service that reads and writes LOVs.
   */
  constructor(private readonly gateway: GatewayBackOfficeService) {}

  /**
   * Handles `GET /v1/lov/:group`.
   *
   * @param group - Group to read.
   * @returns The group's LOVs.
   */
  @Get(':group')
  @RequirePermissions(PERMISSIONS.LOV_READ)
  getByGroup(@Param('group') group: string): Promise<LOV[]> {
    return this.gateway.getLovByGroup(group)
  }

  /**
   * Handles `POST /v1/lov`.
   *
   * @param body - The new LOV.
   * @returns The stored LOV.
   */
  @Post()
  @RequirePermissions(PERMISSIONS.LOV_WRITE)
  create(@Body() body: CreateLovDto): Promise<LOV> {
    const { reason, ...data } = body
    return this.gateway.createLov(data, reason)
  }

  /**
   * Handles `PATCH /v1/lov/:id`.
   *
   * @param id - LOV identifier.
   * @param body - Fields to change.
   * @returns The updated LOV.
   */
  @Patch(':id')
  @RequirePermissions(PERMISSIONS.LOV_WRITE)
  update(@Param('id') id: string, @Body() body: UpdateLovDto): Promise<LOV> {
    const { reason, ...changes } = body
    return this.gateway.updateLov(id, changes, reason)
  }
}
