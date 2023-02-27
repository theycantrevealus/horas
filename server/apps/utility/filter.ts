export function filterSetDT(str, target) {
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
