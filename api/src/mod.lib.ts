import { AccountService } from "./account/account.service"
import { LogService } from "./log/log.service"

const idenClass: any = {
    'account': AccountService,
    'log': LogService
}

const colCodeName: any = {
    'id': 'iden',
    'uid': 'iden'
}

export { idenClass, colCodeName }