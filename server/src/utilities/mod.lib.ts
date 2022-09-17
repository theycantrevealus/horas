import * as uuid from 'uuid'

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

function gen_uuid(type = 'v4') {
  if (type === 'v4') {
    return uuid.v4()
  } else {
    return uuid.v1()
  }
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

export { colCodeName, isJsonString, filterSetDT, gen_uuid }
