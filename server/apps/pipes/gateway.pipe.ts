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
      const errorList = await this.getConstraints(errors)

      // for (const e of errors) {
      //   if (e && e.constraints) errorList.push(e.constraints)
      // }
      // errors.forEach((e) => {
      //   if (e) errorList.push(e.constraints)
      // })

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

  private async getConstraints(obj) {
    const constraints = []

    function recursiveLoop(obj) {
      obj.forEach((item) => {
        if (item.constraints) constraints.push(item.constraints)
        if (item.children.length > 0) {
          recursiveLoop(item.children)
        }
      })
    }

    recursiveLoop(obj)

    return constraints
  }

  private toValidate(metatype): boolean {
    const types = [String, Boolean, Number, Array, Object]
    return !types.includes(metatype)
  }
}
