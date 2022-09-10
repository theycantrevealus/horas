export function validateName (name:string) {
  const validNamePattern = /^[a-zA-Z]+(?:[-'\s][a-zA-Z]+)*$/
  if (validNamePattern.test(name)) {
    return true
  }
  return false
}

export function validateEmail (email:string) {
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  return re.test(String(email).toLowerCase())
}
