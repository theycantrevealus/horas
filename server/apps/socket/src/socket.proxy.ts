import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ClientProxy, ReadPacket, WritePacket } from '@nestjs/microservices'

import { SocketIoClientProvider } from './socket.provider'

@Injectable()
export class SocketIoClientProxyService extends ClientProxy {
  @Inject(SocketIoClientProvider)
  private client: SocketIoClientProvider

  constructor(
    @Inject(ConfigService)
    private readonly config: ConfigService
  ) {
    super()
  }

  async connect(): Promise<any> {
    this.client.getSocket()
  }

  async close() {
    this.client.getSocket().disconnect()
  }

  /**
   * this method use when you use SocketIoClientProxyService.emit
   * @param packet
   * @returns
   */
  async dispatchEvent(packet: ReadPacket<any>): Promise<any> {
    this.client.getSocket().emit(packet.pattern, packet.data)
    return
  }

  /**
   * this method will be call when use SocketIoClientProxyService.send
   * can be use to implement request-response
   * @param packet
   * @param callback
   * @returns
   */
  publish(
    packet: ReadPacket<any>,
    callback: (packet: WritePacket<any>) => void
  ) {
    setTimeout(() => callback({ response: packet.data }), 5000)

    return () => console.log()
  }
}
