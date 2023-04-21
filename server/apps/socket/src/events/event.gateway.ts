import { CACHE_MANAGER, Inject } from '@nestjs/common'
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
  WsResponse,
} from '@nestjs/websockets'
import { JWTTokenDecodeResponse } from '@security/auth.dto'
import { AuthService } from '@security/auth.service'
import { ProceedDataTrafficDTO } from '@socket/dto/neuron'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { Cache } from 'cache-manager'
import { from, Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { Server, Socket } from 'socket.io'
import { Logger } from 'winston'

import { IConfig } from '../../../core/src/schemas/config'
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

  @SubscribeMessage('events')
  findAll(
    @MessageBody() data: any,
    @ConnectedSocket() client: Socket
  ): Observable<WsResponse<number>> {
    return from([1, 2, 3]).pipe(
      map((item) => ({ event: 'events', data: item }))
    )
  }

  @SubscribeMessage('identity')
  async identity(@MessageBody() data: number): Promise<number> {
    return data
  }

  @SubscribeMessage('proceed')
  async process_result(
    @MessageBody() data: ProceedDataTrafficDTO,
    @ConnectedSocket() client: Socket
  ) {
    this.io.sockets.emit(
      this.configService.get<string>('neural.event.notify_result.data'),
      data
    )
    return data
  }

  async afterInit() {
    this.io.use(async (socket, next) => {
      if (
        socket.handshake.headers.authorization &&
        socket.handshake.headers.authorization
      ) {
        const token: string = socket.handshake.headers.authorization
          .split('Bearer')[1]
          .trim()
        const decodeTokenResponse: JWTTokenDecodeResponse =
          await this.authService.validate_token({
            token: token,
          })
        if (!decodeTokenResponse.account)
          return next(new Error('Authentication error'))
        next()
      } else {
        next(new Error('Authentication error'))
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
