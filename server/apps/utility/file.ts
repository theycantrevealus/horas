import { MultipartFile } from '@fastify/multipart'
import {
  FileTypeValidator,
  FileValidator,
  MaxFileSizeValidator,
} from '@nestjs/common'
import { MultipartOptions, StorageMultipartFile } from '@utility/dto/file'
import * as fs from 'fs'
import { extname } from 'path'

export const getFileFromPart = async (
  part: MultipartFile
): Promise<StorageMultipartFile> => {
  const buffer = await part.toBuffer() // <-- $1;
  return {
    buffer,
    size: buffer.byteLength,
    filename: part.filename,
    mimetype: part.mimetype,
    fieldname: part.fieldname,
  }
}

export const validateFile = (
  file: StorageMultipartFile,
  options: MultipartOptions
): string | void => {
  const validators: FileValidator[] = []

  if (options.maxFileSize)
    validators.push(new MaxFileSizeValidator({ maxSize: options.maxFileSize }))
  if (options.fileType)
    validators.push(new FileTypeValidator({ fileType: options.fileType }))
  if (options.modifier) {
    const curr_date = new Date().toISOString().split('T')
    const time = curr_date[1].split('.')[0].replace(/:/g, '-')
    const targetName = `${options.modifier.dest}/${options.modifier.prefix}${
      curr_date[0]
    }_${time}${extname(file.filename)}`
    file.filename = targetName
    fs.writeFileSync(targetName, file.buffer)
  }

  for (const validator of validators) {
    if (validator.isValid(file)) continue

    return validator.buildErrorMessage(file)
  }
}
