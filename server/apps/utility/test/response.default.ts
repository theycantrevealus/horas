import { HttpStatus } from '@nestjs/common'
import { GlobalResponse } from '@utility/dto/response'
import { plainToClass } from 'class-transformer'
import { isJSON, validate } from 'class-validator'
import { LightMyRequestResponse } from 'fastify'
import { LeveledLogMethod } from 'winston'

export async function HTTPDefaultResponseCheck(
  response: LightMyRequestResponse,
  defaultStatus: number,
  logger: LeveledLogMethod
) {
  // Should return as defined
  expect(response.statusCode).toEqual(defaultStatus)

  const noBody = [HttpStatus.NO_CONTENT]

  if (noBody.indexOf(defaultStatus) < 0) {
    // Response body must be a JSON
    expect(isJSON(response.body)).toBe(true)

    const responseParsed = JSON.parse(response.body)

    const responseCheck = await validate(
      plainToClass(GlobalResponse, responseParsed)
    )

    // Response body must be format as Global Response
    expect(responseCheck.length).toBe(0)

    // Response body must return message property
    expect(responseParsed.message).toBeDefined()

    // Response message property must be filled
    expect(responseParsed.message).not.toBe('')
  }

  // Request must be logged
  if (logger) expect(logger).toHaveBeenCalled()
}
