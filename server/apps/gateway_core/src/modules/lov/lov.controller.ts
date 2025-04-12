import { Authorization, CredentialAccount } from '@decorators/authorization'
import { PermissionManager } from '@decorators/permission'
import { LOVAddDTO, LOVEditDTO } from '@gateway_core/lov/dto/lov'
import { LOVService } from '@gateway_core/lov/lov.service'
import { JwtAuthGuard } from '@guards/jwt'
import { HORASInterceptor } from '@interceptors/default'
import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
  Version,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger'
import { ApiQueryGeneral } from '@utility/dto/prime'

@Controller('lov')
@ApiTags('LOV')
export class LOVController {
  constructor(@Inject(LOVService) private readonly lovService: LOVService) {}

  @Get()
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'LOV', action: 'view' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Fetch all',
    description: 'Showing brand data',
  })
  @ApiQuery(ApiQueryGeneral.primeDT)
  async all(@Query('lazyEvent') parameter: string) {
    return await this.lovService.all(parameter)
  }

  @Get(':id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'LOV', action: 'view' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Detail data',
    description: '',
  })
  @ApiParam({
    name: 'id',
  })
  async detail(@Param() param) {
    return await this.lovService.detail(param.id)
  }

  @Post()
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'LOV', action: 'add' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Add new lov',
    description: ``,
  })
  async add(@Body() parameter: LOVAddDTO, @CredentialAccount() account) {
    return await this.lovService.add(parameter, account)
  }

  @Patch(':id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'LOV', action: 'edit' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Edit lov',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async edit(@Body() parameter: LOVEditDTO, @Param() param) {
    return await this.lovService.edit(parameter, param.id)
  }

  @Delete(':id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'LOV', action: 'delete' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Delete lov',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async delete(@Param() param) {
    return await this.lovService.delete(param.id)
  }
}
