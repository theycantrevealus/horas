import { LoggingInterceptor } from '@interceptors/logging'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Inject, UseInterceptors } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import { IConfig } from '@schemas/config/config'
import { JWTTokenDecodeResponse } from '@security/auth.dto'
import { AuthService } from '@security/auth.service'
import { ProceedDataTrafficDTO } from '@socket/dto/neuron'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { Cache } from 'cache-manager'
import { Server } from 'socket.io'
import { Socket } from 'socket.io-client'
import { Logger } from 'winston'
// origin: [
//   'http://localhost:port',
//   new RegExp(`/^http:\/\/192\.168\.1\.([1-9]|[1-9]\d):port$/`),
// ],
@WebSocketGateway(9900, {
  allowEIO3: true,
  cors: {
    origin: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  },
})
export class EventsGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  io: Server

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,

    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,

    @Inject(CACHE_MANAGER) private cacheManager: Cache,

    @Inject(AuthService) private readonly authService: AuthService
  ) {
    //
  }

  // @SubscribeMessage('events')
  // findAll(
  //   @MessageBody() data: any,
  //   @ConnectedSocket() client: Socket
  // ): Observable<WsResponse<number>> {
  //   return from([1, 2, 3]).pipe(
  //     map((item) => ({ event: 'events', data: item }))
  //   )
  // }
  //
  // @SubscribeMessage('identity')
  // async identity(@MessageBody() data: number): Promise<number> {
  //   return data
  // }

  @SubscribeMessage('proceed')
  @UseInterceptors(LoggingInterceptor)
  // @UseInterceptors(SocketInterceptor)
  async process_result(
    @MessageBody() data: ProceedDataTrafficDTO
    // @ConnectedSocket() client: Socket
  ) {
    /*
     * TODO : Add interceptor to handle data response code and notify to client (Transfer it to transport.winston.ts)
     *  1. Receiver manager - Dont forget to set target receiver manager
     *  2. Log the socket traffic at winston - Condition for socket traffic only
     * */

    // this.logger.verbose(`Data from ${client.id} : ${JSON.stringify(data)}`)
    console.log(data)
    this.io.sockets.emit(
      this.configService.get<string>('neural.event.notify_result.data'),
      data
    )
    return data
  }

  @SubscribeMessage('config')
  async config_update(
    @MessageBody() data: ProceedDataTrafficDTO,
    @ConnectedSocket() client: Socket
  ) {
    this.logger.verbose(`Config from ${client.id} : ${JSON.stringify(data)}`)
    this.io.sockets.emit(
      this.configService.get<string>('neural.event.configuration.update'),
      data
    )
    return data
  }

  @SubscribeMessage('queue')
  async queue_update(
    @MessageBody() data: ProceedDataTrafficDTO,
    @ConnectedSocket() client: Socket
  ) {
    this.logger.verbose(`Queue from ${client.id} : ${JSON.stringify(data)}`)
    this.io.sockets.emit(
      this.configService.get<string>('neural.event.queue.new'),
      data
    )
    return data
  }

  async afterInit() {
    this.io.use(async (socket, next) => {
      try {
        if (
          socket.handshake.headers.authorization &&
          socket.handshake.headers.authorization
        ) {
          const token: string = socket.handshake.headers.authorization
            .toString()
            .split('Bearer')[1]
            .trim()
          const decodeTokenResponse: JWTTokenDecodeResponse =
            await this.authService.validate_token({
              token: token,
            })
          if (!decodeTokenResponse.account)
            return next(new Error('Not authorized'))
          next()
        } else {
          next(new Error('No token found / Malformed token'))
        }
      } catch (e) {
        next(new Error('No token found / Malformed token'))
      }
    })
  }

  async handleDisconnect(client: any, ...args: any[]) {
    const connectedClients: IConfig = await this.cacheManager.get(
      'CONNECTED_SOCKET'
    )

    const clientMeta = connectedClients.setter
    delete clientMeta[client.id]
    await this.cacheManager.set('CONNECTED_SOCKET', {
      setter: clientMeta,
      __v: 0,
    })
  }

  async handleConnection(client: any, ...args: any[]) {
    const connectedClients: IConfig = await this.cacheManager.get(
      'CONNECTED_SOCKET'
    )

    const token: string = client.handshake.headers.authorization
      .split('Bearer')[1]
      .trim()

    const decodeTokenResponse: JWTTokenDecodeResponse =
      await this.authService.validate_token({
        token: token,
      })

    let clientMeta = {}

    if (!connectedClients) {
      if (!clientMeta[client.id]) {
        clientMeta[client.id] = {}
      }
      clientMeta[client.id] = decodeTokenResponse.account
    } else {
      clientMeta = connectedClients.setter
      if (!clientMeta[client.id]) {
        clientMeta[client.id] = {}
      }
      clientMeta[client.id] = decodeTokenResponse.account
    }

    await this.cacheManager.set('CONNECTED_SOCKET', {
      setter: clientMeta,
      __v: 0,
    })
  }
}
