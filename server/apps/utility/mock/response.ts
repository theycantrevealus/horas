import { GlobalResponse } from '@utility/dto/response'
import { CustomErrorCode } from '@utility/modules'

export const mockResponse = (target: any): GlobalResponse => {
  const statusCode: CustomErrorCode = {
    defaultCode: target.code.error.databaseError.defaultCode,
    customCode: target.code.error.databaseError.customCode,
    classCode: target.code.defaultCode,
  }

  return {
    statusCode: statusCode,
    message: target.message,
    payload: target.payload,
    transaction_classify: target.transaction_classify,
    transaction_id: target.transaction_id,
  } satisfies GlobalResponse
}
