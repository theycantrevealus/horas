
import { Injectable, NestMiddleware } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'

@Injectable()
export class LoginLogMiddleware implements NestMiddleware {
    use (req: Request, res: Response, next: NextFunction) {
        console.log('Request...')
        next()
    }
}
