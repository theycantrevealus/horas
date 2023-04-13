import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { io, Socket } from 'socket.io-client'

@Injectable()
export class SocketIoClientProvider {
  @Inject(ConfigService)
  private readonly config: ConfigService

  private socket: Socket

  private connect() {
    this.socket = io(
      `${this.config.get('socket_io.host')}:${this.config.get(
        'socket_io.port'
      )}`
    )
    return this.socket
  }

  getSocket = () => {
    if (!this.socket) {
      return this.connect()
    }
    return this.socket
  }
}
