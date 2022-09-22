import { Authorization } from '@/decorators/auth.decorator'
import { JwtAuthGuard } from '@/guards/jwt.guard'
import { LoggingInterceptor } from '@/interceptors/logging.interceptor'
import { CoreMenuPermissionModel } from '@/models/core.menu.permission.model'
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger'
import { MenuPermissionService } from './menu.permission.service'

@Controller('menu_permission')
@ApiTags('menu_permission')
export class MenuPermissionController {
  constructor(private menuPermissionService: MenuPermissionService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @Get()
  async list() {
    return await this.menuPermissionService.all()
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @ApiParam({
    name: 'id',
  })
  @Get(':id/detail')
  async detail(@Param() param) {
    return await this.menuPermissionService.detail(param.id)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @Post('add')
  async add(@Body() data: CoreMenuPermissionModel) {
    return await this.menuPermissionService.add(data)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiParam({
    name: 'id',
  })
  @Put(':id/edit')
  async edit(@Query() data: CoreMenuPermissionModel, @Param() param) {
    return await this.menuPermissionService.edit(data, param.id)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @ApiParam({
    name: 'id',
  })
  @UseInterceptors(LoggingInterceptor)
  @Delete(':id/delete')
  async delete_soft(@Param() param) {
    return await this.menuPermissionService.delete_soft(param.id)
  }
}
