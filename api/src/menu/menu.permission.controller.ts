import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards, UseInterceptors } from "@nestjs/common"
import { ApiBearerAuth, ApiParam, ApiTags } from "@nestjs/swagger"
import { JwtAuthGuard } from "../guard/jwt.guard"
import { MenuGroupService } from "./menu.group.service"
import { Authorization } from '../decorator/auth.decorator'
import { LoggingInterceptor } from '../interceptor/logging'
import { MenuGroupAddDTO } from "./dto/menu.group.add.dto"
import { MenuGroupEditDTO } from "./dto/menu.group.edit.dto"
import { MenuPermissionService } from "./menu.permission.service"
import { MenuPermissionAddDTO } from "./dto/menu.permission.add.dto"
import { MenuPermissionEditDTO } from "./dto/menu.permission.edit.dto"

@Controller('menu_permission')
@ApiTags('menu_permission')
export class MenuPermissionController {
    constructor(
        private menuPermissionService: MenuPermissionService
    ) { }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT')
    @Authorization(true)
    @Get()
    async list () {
        return await this.menuPermissionService.all()
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT')
    @Authorization(true)
    @ApiParam({
        name: 'id'
    })
    @Get(':id/detail')
    async detail (@Param() param) {
        return await this.menuPermissionService.detail(param.id)
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT')
    @Authorization(true)
    @UseInterceptors(LoggingInterceptor)
    @Post('add')
    async add (@Body() data: MenuPermissionAddDTO) {
        return await this.menuPermissionService.add(data)
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT')
    @Authorization(true)
    @UseInterceptors(LoggingInterceptor)
    @ApiParam({
        name: 'id'
    })
    @Put(':id/edit')
    async edit (@Query() data: MenuPermissionEditDTO, @Param() param) {
        return await this.menuPermissionService.edit(data, param.id)
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT')
    @Authorization(true)
    @ApiParam({
        name: 'id'
    })
    @UseInterceptors(LoggingInterceptor)
    @Delete(':id/delete')
    async delete_soft (@Param() param) {
        return await this.menuPermissionService.delete_soft(param.id)
    }
}