import { getTimeStamp } from '@/utilities/mod.lib'
import { setSeederFactory } from 'typeorm-extension'
import { AccountAuthorityModel } from '@/models/account.authority.model'

export default setSeederFactory(AccountAuthorityModel, async (faker) => {
  const data = new AccountAuthorityModel()
  data.name = `${faker.name.firstName('male')} Department`
  data.created_at = new Date(getTimeStamp())
  data.updated_at = new Date(getTimeStamp())

  return data
})
