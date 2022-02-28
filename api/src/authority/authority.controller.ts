import { Controller, Body, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LoginDTO } from './dto/user.login';

@Controller('authority')
@ApiTags('authority')
export class AuthorityController {
  @Post('login')
  async login(@Body() data: LoginDTO) {
    return '';
  }
}
