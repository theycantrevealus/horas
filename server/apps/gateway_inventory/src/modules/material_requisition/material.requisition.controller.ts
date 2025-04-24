import { Authorization, CredentialAccount } from '@decorators/authorization'
import { PermissionManager } from '@decorators/permission'
import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { JwtAuthGuard } from '@guards/jwt'
import { LoggingInterceptor } from '@interceptors/logging'
import {
  Body,
  Controller,
  Delete,
  Inject,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
  Version,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { GlobalResponse } from '@utility/dto/response'
import { FastifyRequest } from 'fastify'

import {
  MaterialRequisitionAddDTO,
  MaterialRequisitionEditDTO,
} from './dto/material.requisition'
import { MaterialRequisitionApproval } from './dto/material.requisition.approval'
import { GatewayInventoryMaterialRequisitionService } from './material.requisition.service'

@Controller('inventory')
@ApiTags('Material Requisition')
export class GatewayInventoryMaterialRequisitionController {
  constructor(
    @Inject(GatewayInventoryMaterialRequisitionService)
    private readonly materialRequisitionService: GatewayInventoryMaterialRequisitionService
  ) {}

  @Post('material_requisition')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MaterialRequisition', action: 'add' })
  @ApiOperation({
    summary: 'Add new',
    description: ``,
  })
  async add(
    @Body() parameter: MaterialRequisitionAddDTO,
    @CredentialAccount() account: IAccount,
    @Req() request: FastifyRequest
  ): Promise<GlobalResponse> {
    return await this.materialRequisitionService.add(
      parameter,
      account,
      request.headers.authorization
    )
  }

  @Patch('material_requisition/ask_approval/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MaterialRequisition', action: 'ask_approval' })
  @ApiOperation({
    summary: 'Ask for approval new material requisition',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async askApproval(
    @Body() parameter: MaterialRequisitionApproval,
    @Param() param: any,
    @CredentialAccount() account: IAccount,
    @Req() request: FastifyRequest
  ): Promise<GlobalResponse> {
    return await this.materialRequisitionService.askApproval(
      parameter,
      param.id,
      account,
      request.headers.authorization
    )
  }

  @Patch('material_requisition/approve/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MaterialRequisition', action: 'approve' })
  @ApiOperation({
    summary: 'Approve material requisition',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async approve(
    @Body() parameter: MaterialRequisitionApproval,
    @Param() param: any,
    @CredentialAccount() account: IAccount,
    @Req() request: FastifyRequest
  ): Promise<GlobalResponse> {
    return await this.materialRequisitionService.approve(
      parameter,
      param.id,
      account,
      request.headers.authorization
    )
  }

  @Patch('material_requisition/decline/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MaterialRequisition', action: 'decline' })
  @ApiOperation({
    summary: 'Decline material requistion',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async decline(
    @Body() parameter: MaterialRequisitionApproval,
    @Param() param: any,
    @CredentialAccount() account: IAccount,
    @Req() request: FastifyRequest
  ): Promise<GlobalResponse> {
    return await this.materialRequisitionService.decline(
      parameter,
      param.id,
      account,
      request.headers.authorization
    )
  }

  @Patch('material_requisition/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MaterialRequisition', action: 'edit' })
  @ApiOperation({
    summary: 'Edit material requisition',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async edit(
    @Body() parameter: MaterialRequisitionEditDTO,
    @Param() param: any,
    @CredentialAccount() account: IAccount
  ) {
    return await this.materialRequisitionService.edit(
      parameter,
      param.id,
      account
    )
  }

  @Delete('material_requisition/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MaterialRequisition', action: 'delete' })
  @ApiOperation({
    summary: 'Delete material requisition',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async delete(
    @Param() param: any,
    @CredentialAccount() account: IAccount,
    @Req() request: FastifyRequest
  ): Promise<GlobalResponse> {
    return await this.materialRequisitionService.delete(
      param.id,
      account,
      request.headers.authorization
    )
  }
}
