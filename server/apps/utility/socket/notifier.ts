import { ProceedDataTrafficDTO } from '@gateway_socket/dto/neuron'
import { SocketIoClientProxyService } from '@gateway_socket/socket.proxy'
import { Logger } from 'winston'

export async function socketNotifier(
  client: SocketIoClientProxyService,
  logger: Logger,
  payload
) {
  await client
    .reconnect({
      extraHeaders: {
        Authorization: payload.token,
      },
    })
    .then(async (clientSet) => {
      await clientSet
        .emit('proceed', {
          sender: payload.account,
          receiver: null,
          payload: payload.response,
        } satisfies ProceedDataTrafficDTO)
        .then(() => {
          clientSet.disconnect()
        })
    })
    .catch((e: Error) => {
      logger.error(e)
    })
}
