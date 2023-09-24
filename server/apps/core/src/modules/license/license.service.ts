import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { LicenseAddDTO } from '@core/license/dto/license'
import { License, LicenseDocument } from '@core/license/schemas/license'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { GlobalResponse } from '@utility/dto/response'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { modCodes } from '@utility/modules'
import * as child_process from 'child_process'
import * as fs from 'fs'
import { Model } from 'mongoose'
import * as path from 'path'
import { Logger } from 'winston'

@Injectable()
export class LicenseService {
  constructor(
    @InjectModel(License.name)
    private readonly licenseModel: Model<LicenseDocument>,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger
  ) {}

  async add(
    parameter: LicenseAddDTO,
    credential: IAccountCreatedBy
  ): Promise<GlobalResponse> {
    const generateDir = path.resolve(`${process.cwd()}/certificates`)
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'LICENSE_ADD',
      transaction_id: null,
    } satisfies GlobalResponse

    const privateCertificate = child_process.spawn(
      'openssl',
      [
        'req',
        '-x509',
        '-newkey',
        'rsa:2048',
        '-subj',
        `/C=${parameter.country_code}/ST=${parameter.state}/L=${parameter.city}/O=${parameter.organization}/CN=${parameter.email}`,
        '-keyout',
        `${generateDir}/private.pem`,
        '-out',
        `${generateDir}/certificate.pem`,
        '-days',
        parameter.age.toString(),
        '-passout',
        `pass:${parameter.password}`,
      ],
      {
        stdio: 'pipe',
        shell: false,
      }
    )

    const resultCode = {
      privateKey: 99,
      publicKey: 99,
      licenseText: 99,
      digestLicense: 99,
    }
    privateCertificate.on('exit', async (code, signal) => {
      resultCode.privateKey = code
    })

    privateCertificate.on('error', (error) => {
      response.message = `License failed to create. ${error}`
      response.payload = `Event child error : ${error}`
    })

    await new Promise((resolve) => {
      privateCertificate.on('close', resolve)
    })

    // Generate public key
    const publicKey = child_process.spawn('openssl', [
      'rsa',
      '-in',
      `${generateDir}/private.pem`,
      '-pubout',
      '-out',
      `${generateDir}/public.pem`,
      '-passin',
      `pass:${parameter.password}`,
    ])

    publicKey.on('exit', async (code, signal) => {
      resultCode.publicKey = code
    })

    await new Promise((resolve) => {
      publicKey.on('close', resolve)
    })

    await fs.writeFile(
      `${generateDir}/license.txt`,
      'Name=SpongeBob SquarePants\n' +
        'SN=123456789\n' +
        'Features=10101110011\n' +
        'MAC_Address=a2:fe:d6:79:d9:11\n',
      async (err) => {
        if (!err) {
          resultCode.licenseText = 0
        }
      }
    )

    const digest = child_process.spawn('openssl', [
      'dgst',
      '-sign',
      `${generateDir}/private.pem`,
      '-keyform',
      'PEM',
      '-sha256',
      '-passin',
      `"pass:${parameter.password}"`,
      '-out',
      `${generateDir}/license.txt.sign`,
      `${generateDir}/license.txt`,
    ])

    digest.on('exit', async (code, signal) => {
      resultCode.digestLicense = code
    })

    await new Promise((resolve) => {
      digest.on('close', resolve)
    })

    // const base64 = child_process.spawn('base64', [
    //   `${generateDir}/license.sign.txt`,
    // ])

    if (
      resultCode.privateKey === 0 &&
      resultCode.publicKey === 0 &&
      resultCode.licenseText === 0 &&
      resultCode.digestLicense === 1
    ) {
      await this.licenseModel
        .create({
          ...parameter,
          created_bt: credential,
        })
        .then((result) => {
          response.message = 'License created successfully'
          response.transaction_id = result.id
          response.payload = {
            id: result.id,
            ...parameter,
          }
        })
        .catch((error: Error) => {
          response.message = `License failed to create. ${error.message}`
          response.statusCode =
            modCodes[this.constructor.name].error.databaseError
          response.payload = error
          throw new Error(JSON.stringify(response))
        })
    } else {
      response.message = `License failed to create. ${JSON.stringify(
        resultCode
      )}`
      response.statusCode = modCodes[this.constructor.name].error.databaseError
      response.payload = `Error creating license file : ${JSON.stringify(
        resultCode.digestLicense
      )}`
      throw new Error(JSON.stringify(response))
    }
    return response
  }
}
