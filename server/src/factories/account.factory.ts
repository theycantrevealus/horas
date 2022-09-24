import { AccountModel } from '@/models/account.model'
import { getTimeStamp } from '@/utilities/mod.lib'
import { SeederFactory, setSeederFactory } from 'typeorm-extension'
import * as bcrypt from 'bcrypt'
import { define } from 'typeorm-seeding'
import { Faker } from '@faker-js/faker'

export default setSeederFactory(AccountModel, async (faker) => {
  const account = new AccountModel()
  const saltOrRounds = 10

  account.first_name = faker.name.firstName('male')
  account.last_name = faker.name.lastName('male')
  account.email = faker.internet
    .email(account.first_name, account.last_name)
    .toLowerCase()
  account.password = await bcrypt.hash('123456', saltOrRounds)
  account.created_at = new Date(getTimeStamp())
  account.updated_at = new Date(getTimeStamp())

  return account
})
