import { type ClientInfo } from '@identity/authentication/client-info'

/**
 * Request fields needed to describe the calling client. Express and Fastify requests both provide them.
 *
 * @property ip - Client address. Behind a proxy it is the proxy's address until the HTTP adapter trusts the proxy.
 * @property headers - Request headers.
 */
export interface ClientRequest {
  ip?: string
  headers: Record<string, string | string[] | undefined>
}

/**
 * Pattern of an accepted client application name. Anything else becomes `unknown`, so clients
 * cannot put arbitrary text into stored sessions.
 */
const CLIENT_APP_PATTERN = /^[A-Za-z0-9._-]{1,64}$/

/**
 * Reads one header as a single string.
 *
 * @param request - HTTP request.
 * @param name - Lower-case header name.
 * @returns The first value, or `undefined`.
 */
function readHeader(request: ClientRequest, name: string): string | undefined {
  const value = request.headers[name]
  return Array.isArray(value) ? value[0] : value
}

/**
 * Describes the calling client from the request: address, user agent and the application named in `x-client-app`.
 *
 * @param request - HTTP request.
 * @returns The client description.
 */
export function toClientInfo(request: ClientRequest): ClientInfo {
  const app = readHeader(request, 'x-client-app')
  return {
    ip: request.ip ?? null,
    userAgent: readHeader(request, 'user-agent') ?? null,
    app: app && CLIENT_APP_PATTERN.test(app) ? app : 'unknown',
  }
}
