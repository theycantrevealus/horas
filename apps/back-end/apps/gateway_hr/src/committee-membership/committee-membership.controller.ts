import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { type CommitteeMembership } from '@repository/model/committee-membership'
import { type AuthenticatedUser } from '@identity/authenticated-user'
import { CurrentUser, RequirePermissions } from '@identity/guard/decorators'
import { PERMISSIONS } from '@identity/permission'
import { CommitteeMembershipService } from '@workforce/committee/committee-membership.service'
import {
  CreateCommitteeMembershipDto,
  EndCommitteeMembershipDto,
  ListCommitteeMembershipsDto,
} from './committee-membership.dto'

/**
 * Committee memberships of the signed-in user's tenant.
 */
@Controller({ path: 'committee-memberships', version: '1' })
export class CommitteeMembershipController {
  /**
   * @param memberships - Committee membership service.
   */
  constructor(private readonly memberships: CommitteeMembershipService) {}

  /**
   * Handles `GET /v1/committee-memberships`: lists the members of a facility's committees.
   *
   * @param user - Signed-in user.
   * @param query - Facility, optional filters and paging.
   * @returns The memberships.
   */
  @Get()
  @RequirePermissions(PERMISSIONS.WORKFORCE_COMMITTEE_MEMBERSHIP_READ)
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListCommitteeMembershipsDto,
  ): Promise<CommitteeMembership[]> {
    return this.memberships.list(user.tenant_id, query.facilityId, {
      committee: query.committee,
      role: query.role,
      status: query.status,
      limit: query.limit,
      offset: query.offset,
    })
  }

  /**
   * Handles `POST /v1/committee-memberships`: appoints an employee to a committee.
   *
   * @param user - Signed-in user.
   * @param body - The membership.
   * @returns The created membership.
   */
  @Post()
  @RequirePermissions(PERMISSIONS.WORKFORCE_COMMITTEE_MEMBERSHIP_WRITE)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateCommitteeMembershipDto,
  ): Promise<CommitteeMembership> {
    return this.memberships.create(user.tenant_id, {
      employeeId: body.employeeId,
      facilityId: body.facilityId,
      committee: body.committee,
      role: body.role,
      period: { start: body.period.start, end: body.period.end ?? null },
      decisionNumber: body.decisionNumber,
      reason: body.reason,
    })
  }

  /**
   * Handles `POST /v1/committee-memberships/:id/end`: ends a membership on a date.
   *
   * @param user - Signed-in user.
   * @param id - Membership identifier.
   * @param body - Last day, optional version and reason.
   * @returns The ended membership.
   */
  @Post(':id/end')
  @RequirePermissions(PERMISSIONS.WORKFORCE_COMMITTEE_MEMBERSHIP_WRITE)
  end(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: EndCommitteeMembershipDto,
  ): Promise<CommitteeMembership> {
    return this.memberships.end(user.tenant_id, id, body)
  }
}
