import { GeneralReceiveNoteService } from '@inventory/general.receive.note.service'
import { Controller, Inject } from '@nestjs/common'
import { MessagePattern, Payload } from '@nestjs/microservices'

@Controller('inventory')
export class GeneralReceiveNoteController {
  constructor(
    @Inject(GeneralReceiveNoteService)
    private readonly generalReceiveNoteService: GeneralReceiveNoteService
  ) {}

  @MessagePattern('general_receive_note')
  async add(@Payload() payload) {
    await this.generalReceiveNoteService
      .add(payload.id, payload.data, payload.account)
      .then((result) => {
        console.log(result)
      })
      .catch((e: Error) => {
        console.log(e)
      })
  }
}
