import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import { type Page } from '@utility/database/interface'
import { type Employee } from '@repository/model/employee'
import { type AuthenticatedUser } from '@identity/authenticated-user'
import { CurrentUser, RequirePermissions } from '@identity/guard/decorators'
import { PERMISSIONS } from '@identity/permission'
import { EmployeeService } from '@workforce/employee/employee.service'
import {
  ChangeStatusDto,
  ListEmployeesDto,
  RegisterEmployeeDto,
  UpdateEmployeeDto,
} from './employee.dto'

/**
 * Employee records (public and internal data) of the signed-in user's tenant.
 */
@Controller({ path: 'employees', version: '1' })
export class EmployeeController {
  /**
   * @param employees - Employee service.
   */
  constructor(private readonly employees: EmployeeService) {}

  /**
   * Handles `GET /v1/employees`: searches the tenant's employees.
   *
   * @param user - Signed-in user.
   * @param query - Filters and paging.
   * @returns One page of employees.
   */
  @Get()
  @RequirePermissions(PERMISSIONS.WORKFORCE_EMPLOYEE_READ)
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListEmployeesDto,
  ): Promise<Page<Employee>> {
    return this.employees.list(user.tenant_id, query)
  }

  /**
   * Handles `GET /v1/employees/me`: the signed-in user's own record. It needs no permission: an
   * employee may always read their own data. Declared before `:id` so `me` is not an identifier.
   *
   * @param user - Signed-in user.
   * @returns The caller's employee record.
   */
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser): Promise<Employee> {
    return this.employees.getOwn(user.tenant_id, user.employee_id)
  }

  /**
   * Handles `POST /v1/employees`: registers an employee.
   *
   * @param user - Signed-in user.
   * @param body - The employee.
   * @returns The created employee.
   */
  @Post()
  @RequirePermissions(PERMISSIONS.WORKFORCE_EMPLOYEE_WRITE)
  register(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: RegisterEmployeeDto,
  ): Promise<Employee> {
    return this.employees.register(user.tenant_id, body)
  }

  /**
   * Handles `GET /v1/employees/:id`.
   *
   * @param user - Signed-in user.
   * @param id - Employee identifier.
   * @returns The employee.
   */
  @Get(':id')
  @RequirePermissions(PERMISSIONS.WORKFORCE_EMPLOYEE_READ)
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<Employee> {
    return this.employees.get(user.tenant_id, id)
  }

  /**
   * Handles `PATCH /v1/employees/:id`: edits an employee.
   *
   * @param user - Signed-in user.
   * @param id - Employee identifier.
   * @param body - Fields to change.
   * @returns The updated employee.
   */
  @Patch(':id')
  @RequirePermissions(PERMISSIONS.WORKFORCE_EMPLOYEE_WRITE)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: UpdateEmployeeDto,
  ): Promise<Employee> {
    return this.employees.update(user.tenant_id, id, body)
  }

  /**
   * Handles `POST /v1/employees/:id/status`: changes the employment status.
   *
   * @param user - Signed-in user.
   * @param id - Employee identifier.
   * @param body - New status, date, reason and version.
   * @returns The updated employee.
   */
  @Post(':id/status')
  @RequirePermissions(PERMISSIONS.WORKFORCE_EMPLOYEE_STATUS)
  changeStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: ChangeStatusDto,
  ): Promise<Employee> {
    return this.employees.changeStatus(user.tenant_id, id, body)
  }
}
