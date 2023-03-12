import { MenuGroupAddDTO } from '@core/menu/dto/menu.group.add'
import { MenuGroupService } from '@core/menu/menu.group.service'
import { Authorization, CredentialAccount } from '@decorators/authorization'
import { JwtAuthGuard } from '@guards/jwt'
import { LoggingInterceptor } from '@interceptors/logging'
import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  UseInterceptors,
  Version,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { GlobalResponse } from '@utility/dto/response'

@Controller('menu_group')
@ApiTags('Menu Management')
export class MenuGroupController {
  private menuGroupService: MenuGroupService
  constructor(menuGroupService: MenuGroupService) {
    this.menuGroupService = menuGroupService
  }
  @Get()
  @Authorization(true)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Version('1')
  async all() {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @UseInterceptors(LoggingInterceptor)
  @Version('1')
  async add(
    @Body() body: MenuGroupAddDTO,
    @CredentialAccount() account
  ): Promise<GlobalResponse> {
    body.created_by = account
    return await this.menuGroupService.add(body)
  }
}
