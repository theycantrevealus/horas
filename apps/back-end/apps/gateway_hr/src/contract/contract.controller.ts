import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common'
import { type EmploymentContract } from '@repository/model/employment-contract'
import { type AuthenticatedUser } from '@identity/authenticated-user'
import { CurrentUser, RequirePermissions } from '@identity/guard/decorators'
import { PERMISSIONS } from '@identity/permission'
import { ContractService } from '@workforce/contract/contract.service'
import {
  CreateContractDto,
  EmployeeIdParamDto,
  LifecycleDto,
  TerminateContractDto,
  UpdateContractDto,
} from './contract.dto'

/**
 * Employment contracts of the signed-in user's tenant.
 */
@Controller({ path: 'contracts', version: '1' })
export class ContractController {
  /**
   * @param contracts - Contract service.
   */
  constructor(private readonly contracts: ContractService) {}

  /**
   * Handles `POST /v1/contracts`: creates a draft.
   *
   * @param user - Signed-in user.
   * @param body - The contract.
   * @returns The created draft.
   */
  @Post()
  @RequirePermissions(PERMISSIONS.WORKFORCE_CONTRACT_WRITE)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateContractDto,
  ): Promise<EmploymentContract> {
    return this.contracts.create(user.tenant_id, body)
  }

  /**
   * Handles `GET /v1/contracts/:id`.
   *
   * @param user - Signed-in user.
   * @param id - Contract identifier.
   * @returns The contract.
   */
  @Get(':id')
  @RequirePermissions(PERMISSIONS.WORKFORCE_CONTRACT_READ)
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<EmploymentContract> {
    return this.contracts.get(user.tenant_id, id)
  }

  /**
   * Handles `PATCH /v1/contracts/:id`: corrects a draft.
   *
   * @param user - Signed-in user.
   * @param id - Contract identifier.
   * @param body - Fields to change.
   * @returns The updated draft.
   */
  @Patch(':id')
  @RequirePermissions(PERMISSIONS.WORKFORCE_CONTRACT_WRITE)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: UpdateContractDto,
  ): Promise<EmploymentContract> {
    return this.contracts.update(user.tenant_id, id, body)
  }

  /**
   * Handles `POST /v1/contracts/:id/activate`.
   *
   * @param user - Signed-in user.
   * @param id - Contract identifier.
   * @param body - Optional version and reason.
   * @returns The activated contract.
   */
  @Post(':id/activate')
  @RequirePermissions(PERMISSIONS.WORKFORCE_CONTRACT_WRITE)
  activate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: LifecycleDto,
  ): Promise<EmploymentContract> {
    return this.contracts.activate(user.tenant_id, id, body)
  }

  /**
   * Handles `POST /v1/contracts/:id/end`.
   *
   * @param user - Signed-in user.
   * @param id - Contract identifier.
   * @param body - Optional version and reason.
   * @returns The ended contract.
   */
  @Post(':id/end')
  @RequirePermissions(PERMISSIONS.WORKFORCE_CONTRACT_WRITE)
  end(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: LifecycleDto,
  ): Promise<EmploymentContract> {
    return this.contracts.end(user.tenant_id, id, body)
  }

  /**
   * Handles `POST /v1/contracts/:id/terminate`.
   *
   * @param user - Signed-in user.
   * @param id - Contract identifier.
   * @param body - Last day, reason, notes and optional version.
   * @returns The terminated contract.
   */
  @Post(':id/terminate')
  @RequirePermissions(PERMISSIONS.WORKFORCE_CONTRACT_TERMINATE)
  terminate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: TerminateContractDto,
  ): Promise<EmploymentContract> {
    return this.contracts.terminate(user.tenant_id, id, body)
  }
}

/**
 * The contracts of one employee.
 */
@Controller({ path: 'employees', version: '1' })
export class EmployeeContractsController {
  /**
   * @param contracts - Contract service.
   */
  constructor(private readonly contracts: ContractService) {}

  /**
   * Handles `GET /v1/employees/:id/contracts`: lists the employee's contracts, newest first.
   *
   * @param user - Signed-in user.
   * @param params - The employee identifier.
   * @returns The contracts.
   */
  @Get(':id/contracts')
  @RequirePermissions(PERMISSIONS.WORKFORCE_CONTRACT_READ)
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: EmployeeIdParamDto,
  ): Promise<EmploymentContract[]> {
    return this.contracts.list(user.tenant_id, params.id)
  }
}
