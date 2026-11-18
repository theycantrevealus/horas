import { HttpAdapterHost } from '@nestjs/core'
import { Injectable, type OnModuleInit } from '@nestjs/common'
import { type FastifyAdapter } from '@nestjs/platform-fastify'

/**
 * Largest CSV request body, in bytes. A bigger body answers 413 before it is read (HR plan 5.2
 * HC9).
 */
export const CSV_BODY_LIMIT = 512 * 1024

/**
 * Teaches Fastify to read a `text/csv` request body as a string. Without it Fastify answers 415
 * for that content type. The body is passed to the service as text and parsed there.
 */
@Injectable()
export class CsvBodyParser implements OnModuleInit {
  /**
   * @param adapterHost - The HTTP adapter of the application.
   */
  constructor(private readonly adapterHost: HttpAdapterHost<FastifyAdapter>) {}

  /**
   * Registers the parser on the Fastify instance when the module starts, before it serves requests.
   * Another HTTP adapter has no `addContentTypeParser` and is left alone.
   */
  onModuleInit(): void {
    const instance = this.adapterHost.httpAdapter.getInstance()
    if (
      typeof instance.addContentTypeParser !== 'function' ||
      instance.hasContentTypeParser('text/csv')
    ) {
      return
    }
    instance.addContentTypeParser(
      'text/csv',
      { parseAs: 'string', bodyLimit: CSV_BODY_LIMIT },
      (_request, body, done) => done(null, body),
    )
  }
}
