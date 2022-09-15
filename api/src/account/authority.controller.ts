import { Authorization } from '@/decorator/auth.decorator'
import { JwtAuthGuard } from '@/guard/jwt.guard'
import { LoggingInterceptor } from '@/interceptor/logging'
import { isJsonString } from '@/mod.lib'
import {
  Controller,
  UseGuards,
  Get,
  Query,
  Param,
  UseInterceptors,
  Post,
  Body,
  Put,
  Delete,
} from '@nestjs/common'
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger'
import { AuthorityService } from './authority.service'
import { AccountAuthorityAddDTO } from './dto/account.authority.add.dto'
import { AccountAuthorityEditDTO } from './dto/account.authority.edit.dto'

@Controller('authority')
@ApiTags('authority')
export class AuthorityController {
  constructor(private authorityService: AuthorityService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @Get()
  async all() {
    return await this.authorityService.all()
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'List all account authority (Paginate)' })
  @Authorization(true)
  @Get('paginate')
  async paginate(
    @Query('first') first: number,
    @Query('rows') rows: number,
    @Query('sortOrder') sortOrder: number,
    @Query('sortField') sortField: string,
    @Query('filters') filters: any,
  ) {
    const filterSet = isJsonString(filters) ? JSON.parse(filters) : {}
    const data = await this.authorityService.paginate({
      rows: rows,
      first: first,
      sortOrder: sortOrder,
      sortField: sortField,
      filter: filterSet,
    })

    return data
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @ApiParam({
    name: 'uid',
  })
  @ApiOkResponse({
    description: 'Response Success',
  })
  @ApiCreatedResponse({
    description: 'Created Successfully',
  })
  @ApiForbiddenResponse({
    description: 'Need Credential',
  })
  @Get(':uid/detail')
  async detail(@Param() param) {
    return await this.authorityService.detail(param.uid)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @ApiOkResponse({
    description: 'Response Success',
  })
  @ApiCreatedResponse({
    description: 'Created Successfully',
  })
  @ApiForbiddenResponse({
    description: 'Need Credential',
  })
  @ApiBadRequestResponse({
    description: 'Failed to add',
  })
  @UseInterceptors(LoggingInterceptor)
  @Post('add')
  async add(@Body() data: AccountAuthorityAddDTO) {
    return await this.authorityService.add(data)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @ApiOkResponse({
    description: 'Response Success',
  })
  @ApiCreatedResponse({
    description: 'Created Successfully',
  })
  @ApiForbiddenResponse({
    description: 'Need Credential',
  })
  @ApiBadRequestResponse({
    description: 'Failed to edit',
  })
  @ApiParam({
    name: 'uid',
  })
  @UseInterceptors(LoggingInterceptor)
  @Put(':uid/edit')
  async edit(@Body() data: AccountAuthorityEditDTO, @Param() param) {
    return await this.authorityService.edit(data, param.uid)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @ApiParam({
    name: 'uid',
  })
  @UseInterceptors(LoggingInterceptor)
  @Delete(':uid/delete')
  async delete(@Param() param) {
    return await this.authorityService.delete_soft(param.uid)
  }
}
