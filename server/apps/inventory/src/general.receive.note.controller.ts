import { GeneralReceiveNoteService } from '@inventory/general.receive.note.service'
import { Controller, Inject } from '@nestjs/common'
import { MessagePattern, Payload } from '@nestjs/microservices'
import { ProceedDataTrafficDTO } from '@socket/dto/neuron'
import { SocketIoClientProxyService } from '@socket/socket.proxy'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { Logger } from 'winston'

@Controller('inventory')
export class GeneralReceiveNoteController {
  constructor(
    @Inject(GeneralReceiveNoteService)
    private readonly generalReceiveNoteService: GeneralReceiveNoteService,
    @Inject(SocketIoClientProxyService)
    private readonly socketProxy: SocketIoClientProxyService,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger
  ) {
    //
  }

  @MessagePattern('general_receive_note')
  async add(@Payload() payload) {
    switch (payload.action) {
      case 'add':
        await this.generalReceiveNoteService
          .add(payload.id, payload.data, payload.account)
          .then(async (response) => {
            await this.socketProxy
              .reconnect({
                extraHeaders: {
                  Authorization: payload.token,
                },
              })
              .then(async (clientSet) => {
                response.message = 'New purchase order created'
                await clientSet
                  .emit('proceed', {
                    sender: payload.account,
                    receiver: null,
                    payload: response,
                  } satisfies ProceedDataTrafficDTO)
                  .then(() => {
                    clientSet.disconnect()
                  })
              })
              .catch((e: Error) => {
                this.logger.warn(`Failed to connect: ${e}`)
              })
          })
          .catch((e: Error) => {
            this.logger.warn(e)
          })
        break
    }
  }
}
