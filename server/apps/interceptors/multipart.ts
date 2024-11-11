import { MultipartValue } from '@fastify/multipart'
import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  mixin,
  NestInterceptor,
  Type,
} from '@nestjs/common'
import { FastifyRequest, MultipartOptions } from '@utility/dto/file'
import { getFileFromPart, validateFile } from '@utility/file'
import { Observable } from 'rxjs'

export function MultipartInterceptor(
  options: MultipartOptions = {}
): Type<NestInterceptor> {
  class MixinInterceptor implements NestInterceptor {
    async intercept(
      context: ExecutionContext,
      next: CallHandler
    ): Promise<Observable<any>> {
      const req: any = context.switchToHttp().getRequest() as FastifyRequest

      if (!req.isMultipart())
        throw new HttpException(
          'The request should be a form-data',
          HttpStatus.BAD_REQUEST
        )

      const files = {}
      const body = {}

      for await (const part of req.parts()) {
        if (part.type !== 'file') {
          body[part.fieldname] = (part as MultipartValue).value
          continue
        }

        const file = await getFileFromPart(part)
        const validationResult = validateFile(file, options)

        if (validationResult)
          throw new HttpException(
            validationResult,
            HttpStatus.UNPROCESSABLE_ENTITY
          )

        files[part.fieldname] = files[part.fieldname] || []
        files[part.fieldname].push(file)
      }

      req.storedFiles = files
      req.body = body

      return next.handle()
    }
  }

  return mixin(MixinInterceptor)
}
