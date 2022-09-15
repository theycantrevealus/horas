import { AccountService } from './account/account.service'
import { LogService } from './log/log.service'

const idenClass: any = {
  account: AccountService,
  log: LogService,
}

const colCodeName: any = {
  id: 'iden',
  uid: 'iden',
}

function isJsonString(str) {
  try {
    JSON.parse(str)
  } catch (e) {
    return false
  }
  return true
}

function filterSetDT(str, target) {
  target = target === null ? '' : target
  if (str === 'startsWith') {
    return {
      protocol: 'ilike',
      res: `${target}%`,
    }
  } else if (str === 'endsWith') {
    return {
      protocol: 'ilike',
      res: `%${target}`,
    }
  } else if (str === 'contains') {
    return {
      protocol: 'ilike',
      res: `%${target}%`,
    }
  } else if (str === 'notContains') {
    return {
      protocol: 'not like',
      res: `%${target}%`,
    }
  } else if (str === 'equals') {
    return {
      protocol: '=',
      res: `${target}`,
    }
  } else if (str === 'notEquals') {
    return {
      protocol: '!=',
      res: `${target}`,
    }
  } else {
    return {
      protocol: 'ilike',
      res: `%${target}%`,
    }
  }
}

export { idenClass, colCodeName, isJsonString, filterSetDT }
