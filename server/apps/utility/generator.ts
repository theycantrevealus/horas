import * as uuid from 'uuid'

export function gen_uuid(type = 'v4') {
  if (type === 'v4') {
    return uuid.v4()
  } else {
    return uuid.v1()
  }
}
