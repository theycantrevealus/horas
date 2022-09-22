import { Authorization } from '@/decorators/auth.decorator'
import { JwtAuthGuard } from '@/guards/jwt.guard'
import { LoggingInterceptor } from '@/interceptors/logging.interceptor'
import { CoreMenuGroupModel } from '@/models/core.menu.group.model'
import {
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
import { MenuGroupService } from './menu.group.service'

@Controller('menu_group')
@ApiTags('menu_group')
export class MenuGroupController {
  constructor(private menuGroupService: MenuGroupService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @Get()
  async list() {
    return await this.menuGroupService.all()
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @ApiParam({
    name: 'id',
  })
  @Get(':id/detail')
  async detail(@Param() param) {
    return await this.menuGroupService.detail(param.id)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @Post('add')
  async add(@Query() data: CoreMenuGroupModel) {
    return await this.menuGroupService.add(data)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiParam({
    name: 'id',
  })
  @Put(':id/edit')
  async edit(@Query() data: CoreMenuGroupModel, @Param() param) {
    return await this.menuGroupService.edit(data, param.id)
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
    return await this.menuGroupService.delete_soft(param.id)
  }
}
