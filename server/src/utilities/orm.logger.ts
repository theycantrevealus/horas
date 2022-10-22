import { Logger, QueryRunner } from 'typeorm'

export class ORMLogger implements Logger {
  logQueryError(
    error: string | Error,
    query: string,
    parameters?: any[],
    queryRunner?: QueryRunner
  ) {
    throw new Error('Method not implemented.')
  }
  logQuerySlow(
    time: number,
    query: string,
    parameters?: any[],
    queryRunner?: QueryRunner
  ) {
    throw new Error('Method not implemented.')
  }
  logSchemaBuild(message: string, queryRunner?: QueryRunner) {
    throw new Error('Method not implemented.')
  }
  logMigration(message: string, queryRunner?: QueryRunner) {
    throw new Error('Method not implemented.')
  }
  log(level: 'warn' | 'info' | 'log', message: any, queryRunner?: QueryRunner) {
    throw new Error('Method not implemented.')
  }
  logQuery(query: string, parameters?: any[], queryRunner?: QueryRunner) {
    const requestUrl =
      queryRunner && queryRunner.data['request']
        ? '(' + queryRunner.data['request'].url + ') '
        : ''
    console.log(requestUrl + 'executing query: ' + query)
  }
}
