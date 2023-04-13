import { Logger } from '@nestjs/common'
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsResponse,
} from '@nestjs/websockets'
import { ProceedDataTrafficDTO } from '@socket/dto/neuron'
import { from, Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { Server, Socket } from 'socket.io'
// origin: [
//   'http://localhost:port',
//   new RegExp(`/^http:\/\/192\.168\.1\.([1-9]|[1-9]\d):port$/`),
// ],
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway implements OnGatewayConnection {
  @WebSocketServer()
  io: Server

  private readonly logger: Logger = new Logger(EventsGateway.name)

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
  async process_result(@MessageBody() data: ProceedDataTrafficDTO) {
    return data
  }

  handleConnection(client: any, ...args: any[]): any {
    //
  }
}
