export type CoreResponse = {
  statusCode: string
  message: string
  payload: any
  transaction_classify: string
  transaction_id: string
}

export const CoreResponseLib = {
  Login: {
    success: 'ACC_I_S0000',
    failed: '',
  }
}
