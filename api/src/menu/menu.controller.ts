import { Controller, Get, Param, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger'
import { MenuService } from './menu.service'
import { Authorization } from '../decorator/auth.decorator'
import { JwtAuthGuard } from '../guard/jwt.guard'

@Controller('menu')
@ApiTags('menu')
export class MenuController {
    constructor(
        private menuService: MenuService
    ) { }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT')
    @Authorization(true)
    @Get()
    async list () {
        return await this.menuService.all()
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT')
    @Authorization(true)
    @ApiParam({
        name: 'group'
    })
    @Get(':group/tree')
    async tree (@Param() param) {
        return await this.menuService.tree(0, param.group)
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT')
    @Authorization(true)
    @ApiParam({
        name: 'id'
    })
    @Get(':id/detail')
    async detail (@Param() param) {
        return await this.menuService.detail(param.id)
    }
}
