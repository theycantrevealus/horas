import { Injectable, Logger } from '@nestjs/common'
import { isJSON } from 'class-validator'
import * as fs from 'fs'
import { Command, Option, Positional } from 'nestjs-command'
import { DataSource } from 'typeorm'
import { runSeeders } from 'typeorm-extension'
@Injectable()
export class CLIService {
  private uri = ''
  private colls: any[] = []
  private logger = new Logger('HTTP')

  constructor(private dataSource: DataSource) {}

  // @Command({
  //   command: 'seed:starter <data>',
  //   describe: 'Provide system stater data seed',
  // })
  // async export(
  //   @Positional({
  //     name: 'data',
  //     describe: '???',
  //     type: 'string',
  //   })
  //   data: string
  // ): Promise<any> {
  //   return Promise.resolve().then(async () => {
  //     await this.dataSource.initialize()
  //     await runSeeders(this.dataSource, {
  //       seeds: ['src/seeds/**/*{.ts,.js}'],
  //       factories: ['src/factories/**/*{.ts,.js}'],
  //     })
  //       .then(() => {
  //         this.logger.log('Succeed')
  //       })
  //       .catch((e: Error) => {
  //         this.logger.error(e.message)
  //       })
  //   })
  // }

  //   @Command({
  //     command: 'seed:manager <collection>',
  //     describe: 'Export / import current data from mapped collection',
  //   })
  //   async seed(
  //     @Positional({
  //       name: 'collection',
  //       describe: 'collection to be exported',
  //       type: 'string',
  //     })
  //     collection: string,
  //     @Option({
  //       name: 'mode',
  //       describe: 'exp = exmport, imp = import',
  //       alias: 'm',
  //       type: 'string',
  //       default: 'exp',
  //       required: true,
  //     })
  //     mode: string,
  //     @Option({
  //       name: 'replace',
  //       describe:
  //         'if set true it will delete old data and replace with seed data(s)',
  //       alias: 'r',
  //       type: 'boolean',
  //       default: false,
  //       required: false,
  //     })
  //     replace: boolean
  //   ): Promise<any> {
  //     return Promise.resolve().then(async () => {})
  //   }
}
