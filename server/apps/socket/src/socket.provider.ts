import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { io, Socket } from 'socket.io-client'
import { SocketOptions } from 'socket.io-client/build/esm-debug'

@Injectable()
export class SocketIoClientProvider {
  @Inject(ConfigService)
  private readonly config: ConfigService

  private socket: Socket

  private connect(config: SocketOptions) {
    this.socket = io(
      `${this.config.get('socket_io.host')}:${this.config.get(
        'socket_io.port'
      )}`,
      config
    )
    return this.socket
  }

  getSocket = (config: SocketOptions = {}) => {
    // if (!this.socket) {
    //   return this.connect(config)
    // }
    // return this.socket
    return this.connect(config)
  }
}
