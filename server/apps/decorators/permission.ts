import { applyDecorators, SetMetadata } from '@nestjs/common'

export interface PermissionDescriptor {
  group: string
  action: string
}

export function PermissionManager(...permission: PermissionDescriptor[]) {
  return applyDecorators(SetMetadata('permission', permission))
}
