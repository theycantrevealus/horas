import { Inject, Injectable } from '@nestjs/common'
import { KAFKA_MODULE_OPTIONS } from '@utility/kafka/avro/decorator'
import { KafkaModuleOption } from '@utility/kafka/avro/interface'

@Injectable()
export class KafkaModuleOptionsProvider {
  constructor(
    @Inject(KAFKA_MODULE_OPTIONS)
    private readonly kafkaModuleOptions: KafkaModuleOption[]
  ) {}

  getOptionsByName(name: string) {
    return this.kafkaModuleOptions.find((x) => x.name === name).options
  }
}
