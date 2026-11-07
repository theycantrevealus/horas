/**
 * Reference to a file kept by the file/document service.
 *
 * @property file_id - File identifier in the file service.
 * @property content_type - MIME type of the file.
 * @property sha256 - Hex SHA-256 of the content, to detect tampering.
 */
export interface FileRef {
  file_id: string
  content_type: string
  sha256: string
}
