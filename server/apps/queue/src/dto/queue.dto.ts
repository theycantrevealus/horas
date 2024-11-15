import { IMasterQueueMachine } from '@gateway_core/master/interface/master.queue'
import { ConsumerGeneralDataDTO } from '@utility/dto/consumer'

class ConsumerQueueDataDTO {
  machine: IMasterQueueMachine
}

export class ConsumerQueueDTO extends ConsumerGeneralDataDTO {
  data: ConsumerQueueDataDTO
}
