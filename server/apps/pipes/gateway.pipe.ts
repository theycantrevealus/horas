import {
  ArgumentMetadata,
  HttpStatus,
  Injectable,
  PipeTransform,
} from '@nestjs/common'
import { modCodes } from '@utility/modules'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'

@Injectable()
export class GatewayPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value
    }
    const object = plainToInstance(metatype, value)
    const errors = await validate(object)
    if (errors.length > 0) {
      const errorList = []
      errors.forEach((e) => {
        errorList.push(e.constraints)
      })

      throw new Error(
        JSON.stringify({
          statusCode: {
            defaultCode: HttpStatus.BAD_REQUEST,
            customCode: modCodes.Global.success,
            classCode: 'CORE_F0000',
          },
          message: 'Validation issue',
          payload: errorList,
          transaction_classify: '',
          transaction_id: '',
        })
      )
    }
    return value
  }

  private toValidate(metatype): boolean {
    const types = [String, Boolean, Number, Array, Object]
    return !types.includes(metatype)
  }
}
