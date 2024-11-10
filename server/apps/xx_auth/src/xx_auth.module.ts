import { Module } from '@nestjs/common';
import { XxAuthController } from './xx_auth.controller';
import { XxAuthService } from './xx_auth.service';

@Module({
  imports: [],
  controllers: [XxAuthController],
  providers: [XxAuthService],
})
export class XxAuthModule {}
