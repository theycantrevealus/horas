import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { KAFKA_TOPICS } from '@utility/constants'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { Logger } from 'winston'

@Injectable()
export class DecoratorProcessorService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
    @Inject(ConfigService) private readonly configService: ConfigService
  ) {}

  processDecorators(types: any[]) {
    for (const type of types) {
      const propNames = Object.getOwnPropertyNames(type.target.prototype)
      // propNames contain all function exists on target class
      for (const prop of propNames) {
        const propValue = Reflect.getMetadata(
          type.constant,
          Reflect.get(type.target.prototype, prop)
        )

        if (propValue) {
          const topic = this.configService.get<string>(`${type.meta}.${prop}`)
          this.logger.verbose(
            `Setting topic ${topic} for ${type.target.name}#${prop}`
          )

          Reflect.decorate(
            [type.decorator(topic)],
            type.target.prototype,
            prop,
            Reflect.getOwnPropertyDescriptor(type.target.prototype, prop)
          )
        }
      }
    }
  }
}

export function KafkaTopic(variable: string): any {
  return (
    target: any,
    key: string | symbol,
    descriptor: PropertyDescriptor
  ) => {
    Reflect.defineMetadata(KAFKA_TOPICS, variable, descriptor.value)
    return descriptor
  }
}
