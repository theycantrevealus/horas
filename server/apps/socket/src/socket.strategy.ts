import { CustomTransportStrategy, Server } from '@nestjs/microservices'
import { Socket } from 'socket.io-client'

export class SocketIoClientStrategy
  extends Server
  implements CustomTransportStrategy
{
  constructor(private client: Socket) {
    super()
  }

  /**
   * This method is triggered when you run "app.listen()".
   */
  listen(callback: () => void) {
    this.client.on('connection', () => {
      //
    })
    this.client.on('error', (error) => {
      //
    })

    this.messageHandlers.forEach((handler, pattern) => {
      this.client.on(pattern, (data: any) => {
        handler(data, this.client)
      })
    })

    callback()
  }

  /**
   * This method is triggered on application shutdown.
   */
  close() {
    this.client.disconnect()
  }
}
