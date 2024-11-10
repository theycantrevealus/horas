import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Reflector } from '@nestjs/core'
import { Transport } from '@nestjs/microservices'
import { ClientOptions } from '@nestjs/microservices/interfaces/client-metadata.interface'
import { KAFKA_CLIENTS } from '@utility/constants'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { Partitioners } from 'kafkajs'
import { Logger } from 'winston'

@Injectable()
export class ClientDecoratorProcessorService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,

    @Inject(ConfigService) private readonly configService: ConfigService,

    private reflector: Reflector
  ) {
    //
  }

  processDecorators(types: any[]) {
    for (const type of types) {
      const propNames = Object.getOwnPropertyNames(type.target.prototype)
      for (const prop of propNames) {
        const reflectProp = Reflect.get(type.target.prototype, prop)
        const propValue = Reflect.getMetadata(type.constant, reflectProp)

        if (propValue) {
          const kafkaConfig = {
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: this.configService.get<string>(`${type.meta}.client`),
                brokers: this.configService
                  .get<string>(`${type.meta}.broker`)
                  .split(' '),
                ssl: {
                  secureProtocol: this.configService.get<string>(
                    `${type.meta}.ssl.protocol`
                  ),
                  ca: this.configService.get<string>(`${type.meta}.ssl.ca`),
                  passphrase: this.configService.get<string>(
                    `${type.meta}.ssl.passphrase`
                  ),
                },
                sasl: {
                  mechanism: 'scram-sha-512',
                  username: this.configService.get<string>(
                    `${type.meta}.sasl.username`
                  ),
                  password: this.configService.get<string>(
                    `${type.meta}.sasl.password`
                  ),
                },
              },
              producer: {
                createPartitioner: Partitioners.LegacyPartitioner,
              },
              producerOnlyMode: true,
            },
          } satisfies ClientOptions

          Reflect.decorate(
            [type.decorator(kafkaConfig)],
            type.target.prototype,
            prop,
            Reflect.getOwnPropertyDescriptor(type.target.prototype, prop)
          )
        }
      }
    }
  }
}

export function KafkaClient(variable: string): any {
  return (
    target: any,
    key: string | symbol,
    descriptor: PropertyDescriptor
  ) => {
    if (descriptor) {
      Reflect.defineMetadata(KAFKA_CLIENTS, variable, descriptor.value)
      return descriptor
    } else {
      Reflect.defineProperty(target, key, {
        configurable: true,
        writable: true,
        enumerable: true,
        value: {
          a: 123,
          property: '123',
        },
      })

      Reflect.defineMetadata(KAFKA_CLIENTS, variable, target)
      Reflect.defineMetadata('property', key.toString(), target)
    }
  }
}
