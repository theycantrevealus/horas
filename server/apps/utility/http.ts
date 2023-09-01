import { FastifyRequest } from 'fastify'

export function isExpressRequest(
  request: Request | FastifyRequest
): request is Request {
  return (request as FastifyRequest) === undefined
}
