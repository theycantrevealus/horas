import { Injectable, NestMiddleware, Logger } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import { LogActivityModel } from 'src/model/log.activity.model'
import { LogLoginModel } from 'src/model/log.login.model'
import { Repository } from 'typeorm'

@Injectable()
export class LogService {}
