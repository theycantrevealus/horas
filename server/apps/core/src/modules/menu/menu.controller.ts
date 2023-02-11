import { MenuService } from '@core/menu/menu.service'
import { Authorization } from '@decorators/authorization'
import { JwtAuthGuard } from '@guards/jwt'
import { LoggingInterceptor } from '@interceptors/logging'
import {
  Controller,
  Delete,
  Get,
  Post,
  UseGuards,
  UseInterceptors,
  Version,
} from '@nestjs/common'

@Controller('menu')
export class MenuController {
  private menuService: MenuService
  constructor(menuService: MenuService) {
    this.menuService = menuService
  }
  @Get()
  @Authorization(true)
  @UseGuards(JwtAuthGuard)
  @Version('1')
  async all() {}

  @Post()
  @Authorization(true)
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Version('1')
  async add() {}

  // @Patch()
  // @Authorization(true)
  // @UseGuards(JwtAuthGuard)
  // @UseInterceptors(LoggingInterceptor)
  // @Version('1')
  // async edit(@Body() body: MenuAdd): Promise<GlobalResponse> {
  //   return await this.menuService.edit('', '')
  // }

  @Delete()
  @Authorization(true)
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Version('1')
  async delete() {}
}
