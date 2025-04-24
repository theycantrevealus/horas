import { SocketIoClientProvider } from '@gateway_socket/socket.provider'
import { SocketIoClientProxyService } from '@gateway_socket/socket.proxy'
import { LogActivity, LogActivitySchema } from '@log/schemas/log.activity'
import { LogLogin, LogLoginSchema } from '@log/schemas/log.login'
import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import {
  GeneralIssueNote,
  GeneralIssueNoteSchema,
} from '@schemas/inventory/general.issue.note'
import { MongoMiddlewareGeneralIssueNote } from '@schemas/inventory/general.issue.note.middleware'
import {
  MaterialRequisition,
  MaterialRequisitionSchema,
} from '@schemas/inventory/material.requisition'
import { AuthModule } from '@security/auth.module'

import { GatewayInventoryGeneralIssueNoteController } from './general.issue.note.controller'
import { GatewayInventoryGeneralIssueNoteService } from './general.issue.note.service'

@Module({
  imports: [
    MongooseModule.forFeature(
      [
        { name: LogLogin.name, schema: LogLoginSchema },
        { name: LogActivity.name, schema: LogActivitySchema },
        { name: MaterialRequisition.name, schema: MaterialRequisitionSchema },
        { name: GeneralIssueNote.name, schema: GeneralIssueNoteSchema },
      ],
      'primary'
    ),
    AuthModule,
  ],
  controllers: [GatewayInventoryGeneralIssueNoteController],
  providers: [
    SocketIoClientProvider,
    SocketIoClientProxyService,
    MongoMiddlewareGeneralIssueNote,
    GatewayInventoryGeneralIssueNoteService,
  ],
  exports: [GatewayInventoryGeneralIssueNoteService],
})
export class GatewayInventoryGeneralIssueNoteModule {}
