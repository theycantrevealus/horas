import { AccountAuthorityModel } from '@/models/account.authority.model'
import { AccountModel } from '@/models/account.model'
import { DataSource } from 'typeorm'
import { Seeder, SeederFactoryManager } from 'typeorm-extension'

class AccountAuthoritySeeder implements Seeder {
  public async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager
  ): Promise<any> {
    const dataFactory = await factoryManager.get(AccountAuthorityModel)
    await dataFactory.saveMany(5)
  }
}

class AccountSeeder implements Seeder {
  public async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager
  ): Promise<any> {
    // const repository = dataSource.getRepository(AccountModel)
    // await repository.insert([
    //   {
    //     first_name: faker.name.firstName('male'),
    //     last_name: faker.name.lastName('male'),
    //     password: await bcrypt.hash('123456', 10),
    //     email: faker.internet
    //       .email(account.first_name, account.last_name)
    //       .toLowerCase(),
    //     created_at: new Date(getTimeStamp()),
    //     updated_at: new Date(getTimeStamp()),
    //   },
    // ])

    //Load fixed dataset
    //Generate dummy data
    const dataFactory = await factoryManager.get(AccountModel)
    // await userFactory.save()
    await dataFactory.saveMany(5)
  }
}

export { AccountAuthoritySeeder, AccountSeeder }
