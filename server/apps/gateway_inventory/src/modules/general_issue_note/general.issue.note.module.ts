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
import { SocketIoClientProvider } from '@socket/socket.provider'
import { SocketIoClientProxyService } from '@socket/socket.proxy'

import { GeneralIssueNoteController } from './general.issue.note.controller'
import { GeneralIssueNoteService } from './general.issue.note.service'

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
  controllers: [GeneralIssueNoteController],
  providers: [
    SocketIoClientProvider,
    SocketIoClientProxyService,
    MongoMiddlewareGeneralIssueNote,
    GeneralIssueNoteService,
  ],
  exports: [GeneralIssueNoteService],
})
export class GeneralIssueNoteModule {}
