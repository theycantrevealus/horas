import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { I18nModel } from "../model/i18n.model";
import { LogActivityModel } from "../model/log.activity.model";
import { configService } from "../config/orm";
import { I18nService } from "./i18n.service";
import { AuthService } from "../auth/auth.service";
import { I18nController } from "./i18n.controller";

@Module({
  imports: [
    JwtModule.register({
      secret: `${process.env.JWT_SECRET}`
    }),
    TypeOrmModule.forRoot(configService.getTypeOrmConfig()),
    TypeOrmModule.forFeature([I18nModel, LogActivityModel], 'default')
  ],
  controllers: [I18nController],
  providers: [I18nService, AuthService],
  exports: [I18nService]
})
export class I18nModule { }