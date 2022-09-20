import { AccountAuthorityModel } from '@/models/account.authority.model'
import { AccountModel } from '@/models/account.model'
import { AccountPermissionModel } from '@/models/account.permission.model'
import { AccountPrivilegesModel } from '@/models/account.privileges.model'
import { CoreLogActivityModel } from '@/models/core.logging.activity.model'
import { CoreLogLoginModel } from '@/models/core.logging.login.model'
import { CoreMenuGroupModel } from '@/models/core.menu.group.model'
import { CoreMenuModel } from '@/models/core.menu.model'
import { CoreMenuPermissionModel } from '@/models/core.menu.permission.model'

const entities = [
  AccountModel,
  AccountAuthorityModel,
  AccountPermissionModel,
  AccountPrivilegesModel,
  CoreLogLoginModel,
  CoreLogActivityModel,
  CoreMenuModel,
  CoreMenuGroupModel,
  CoreMenuPermissionModel,
]

export { AccountModel }
export default entities
