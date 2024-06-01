import { HttpStatus } from '@nestjs/common'
import { GlobalResponse } from '@utility/dto/response'

export const mockKafkaTransaction = {
  transaction: () => ({
    abort: () => jest.fn(),
    send: () => ({
      then: () =>
        jest.fn().mockResolvedValue({
          statusCode: {
            defaultCode: HttpStatus.OK,
            customCode: '',
            classCode: '',
          },
          message: '',
          payload: {},
          transaction_classify: '',
          transaction_id: '',
        } satisfies GlobalResponse),
    }),
    commit: () =>
      jest.fn().mockResolvedValue({
        statusCode: {
          defaultCode: HttpStatus.OK,
          customCode: '',
          classCode: '',
        },
        message: '',
        payload: {},
        transaction_classify: '',
        transaction_id: '',
      } satisfies GlobalResponse),
  }),
}
