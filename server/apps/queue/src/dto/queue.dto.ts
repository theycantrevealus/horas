import { IMasterQueueMachine } from '@schemas/master/master.queue.machine'
import { ConsumerGeneralDataDTO } from '@utility/dto/consumer'

class ConsumerQueueDataDTO {
  machine: IMasterQueueMachine
}

export class ConsumerQueueDTO extends ConsumerGeneralDataDTO {
  data: ConsumerQueueDataDTO
}
