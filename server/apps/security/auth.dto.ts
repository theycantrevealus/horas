export interface JWTTokenResponse {
  status: number
  account: any
  expired_at: Date
  login_id: number
  token: string | null
  message: string
}

export interface JWTTokenDecodeResponse {
  status: number
  token: string | null
  account: any
  login_id: number
  message: string
}
