export class BPJSVClaimRequest {
  request: any
}

export class BPJSResponseMeta {
  code: string
  message: string
}

export class BPJSResponse {
  metadata: BPJSResponseMeta
  response: any
}
