import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { TypeOrmModule } from '@nestjs/typeorm'
import { LogActivityModel } from '../../model/log.activity.model'
import { AuthService } from '../../auth/auth.service'
import { configService } from '../../config/orm'
import { MasterItemModel } from '../../model/inventory/master.item.model'
import { MasterItemController } from './master.item.controller'
import { MasterItemService } from './master.item.service'
import { MasterXItemAliasModel } from '../../model/inventory/master.x.item.alias.model'

@Module({
  imports: [
    JwtModule.register({
      secret: `${process.env.JWT_SECRET}`,
    }),
    TypeOrmModule.forRoot(configService.getTypeOrmConfig()),
    TypeOrmModule.forFeature(
      [MasterItemModel, MasterXItemAliasModel, LogActivityModel],
      'default',
    ),
  ],
  controllers: [MasterItemController],
  providers: [MasterItemService, AuthService],
  exports: [MasterItemService],
})
export class MasterItemModule {}
