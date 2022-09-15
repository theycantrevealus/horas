export interface JWTTokenResponse {
  status: number
  account: any
  token: string | null
  message: string
}

export interface JWTTokenDecodeResponse {
  status: number
  token: string | null
  account: any
  message: string
}
