export interface FastifyRequest {
  storedFiles: Record<string, StorageMultipartFile[]>
  body: unknown
}

export interface StorageMultipartFile {
  buffer: Buffer
  filename: string
  size: number
  mimetype: string
  fieldname: string
}

export class MultipartOptions {
  constructor(
    public maxFileSize?: number,
    public fileType?: string | RegExp,
    public modifier?: any
  ) {}
}
