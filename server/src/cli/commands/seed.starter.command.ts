import { Injectable, Logger } from '@nestjs/common'
import { Command, Positional } from 'nestjs-command'
import { DataSource } from 'typeorm'
import { runSeeders } from 'typeorm-extension'

type CommandOptions = {
  id?: number
}
@Injectable()
export class SeedStartedCommand {
  private logger = new Logger('HTTP')
  constructor(private dataSource: DataSource) {
    //
  }

  @Command({
    command: 'seed:starter <data>',
    describe: 'Provide system stater data seed',
  })
  async export(
    @Positional({
      name: 'data',
      describe: '???',
      type: 'string',
    })
    data: string
  ): Promise<any> {
    return Promise.resolve().then(async () => {
      // await this.dataSource.initialize()
      await runSeeders(this.dataSource, {
        seeds: ['src/seeds/**/*{.ts,.js}'],
        factories: ['src/factories/**/*{.ts,.js}'],
      })
        .then(() => {
          this.logger.log('Succeed')
        })
        .catch((e: Error) => {
          this.logger.error(e.message)
        })
    })
  }
}
