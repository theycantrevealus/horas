import { Controller, Body, Post, UseGuards, Get, Param, Put, Delete } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiParam, ApiOkResponse, ApiProperty, ApiResponse, ApiCreatedResponse, ApiForbiddenResponse, ApiBadRequestResponse } from '@nestjs/swagger';
import { Authorization } from '../decorator/auth.decorator';
import { AccountAuthorityAddDTO, AccountAuthorityAddDTOResponse } from './dto/account.authority.add.dto';
import { JwtAuthGuard } from '../guard/jwt.guard';
import { AuthorityService } from './authority.service';
import { AccountAuthorityEditDTO } from './dto/account.authority.edit.dto';

@Controller('authority')
@ApiTags('authority')
export class AuthorityController {
    constructor(
        private authorityService: AuthorityService
    ) { }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT')
    @Authorization(true)
    @Get()
    async all () {
        return this.authorityService.all()
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT')
    @Authorization(true)
    @ApiParam({
        name: 'uid'
    })
    @ApiOkResponse({
        description: 'Response Success'
    })
    @ApiCreatedResponse({
        description: 'Created Successfully'
    })
    @ApiForbiddenResponse({
        description: 'Need Credential'
    })
    @Get('detail/:uid')
    async detail (@Param() param) {
        return await this.authorityService.detail(param.uid)
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT')
    @Authorization(true)
    @ApiOkResponse({
        description: 'Response Success'
    })
    @ApiCreatedResponse({
        description: 'Created Successfully'
    })
    @ApiForbiddenResponse({
        description: 'Need Credential'
    })
    @ApiBadRequestResponse({
        description: 'Failed to add'
    })
    @Post('add')
    async add (@Body() data: AccountAuthorityAddDTO) {
        const result = await this.authorityService.add(data);
        return result
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT')
    @Authorization(true)
    @ApiOkResponse({
        description: 'Response Success'
    })
    @ApiCreatedResponse({
        description: 'Created Successfully'
    })
    @ApiForbiddenResponse({
        description: 'Need Credential'
    })
    @ApiBadRequestResponse({
        description: 'Failed to edit'
    })
    @Put('edit')
    async edit (@Body() data: AccountAuthorityEditDTO) {
        const result = await this.authorityService.edit(data);
        return result
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT')
    @Authorization(true)
    @ApiParam({
        name: 'uid'
    })
    @Delete('delete/:uid')
    async delete (@Param() param) {
        const result = await this.authorityService.delete_soft(param.uid);
        return result
    }
}