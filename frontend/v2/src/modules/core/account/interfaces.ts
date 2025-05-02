export interface AccountAdd {
  code: string
  first_name: string
  last_name: string
  email: string
  phone: string
  password?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  menu: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stock_point: any[]
}

export interface AccountEdit extends AccountAdd {
  __v: number
}
