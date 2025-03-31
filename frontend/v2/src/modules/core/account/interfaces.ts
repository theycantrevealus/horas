export interface AccountAdd {
  username: string
  first_name: string
  last_name: string
}

export interface AccountEdit extends AccountAdd {
  __v: number
}
