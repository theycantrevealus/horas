import { NestFactory } from '@nestjs/core'
import { CommandFactory } from 'nest-commander'
import { CommandModule, CommandService } from 'nestjs-command'
import { AppModule } from './app.module'
import { CLIModule } from './cli/cli.module'

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'verbose'],
  })
  try {
    await app.select(CommandModule).get(CommandService).exec()
    await app.close()
  } catch (error) {
    console.error(error)
    await app.close()
    process.exit(1)
  }
}

bootstrap()
