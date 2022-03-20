import { Injectable } from '@nestjs/common';
import { LogActivityModel } from 'src/model/log.activity.model';
import { LogLoginModel } from 'src/model/log.login.model';
import { Repository } from 'typeorm';

@Injectable()
export class LogService {
    constructor(
        private logLoginRepo: Repository<LogLoginModel>,
        private logActivityRepo: Repository<LogActivityModel>,
    ) { }

    async get_next_login_id () {
        return await this.logLoginRepo.findOne({
            order: {
                logged_at: 'DESC'
            }
        })
    }

    async info (target: number) {
        return await this.logLoginRepo.findOne(target)
    }
}
