import { DynamicModule, Module, Provider } from '@nestjs/common'
import { RepositoryFeatureOptions } from './interface'

/**
 * Registers the engine modules and repository providers for one feature.
 * Import the result of `forFeature` in the feature module that uses those repositories.
 */
@Module({})
export class RepositoryModule {
  /**
   * Builds a module that imports the feature's engine modules and binds each repository token.
   *
   * @param options - Engine modules and token-to-class bindings.
   * @returns A dynamic module that exports the repository tokens.
   */
  static forFeature(options: RepositoryFeatureOptions): DynamicModule {
    const providers: Provider[] = options.repositories.map(
      ({ provide, useClass }) => ({ provide, useClass }),
    )

    return {
      module: RepositoryModule,
      imports: options.imports ?? [],
      providers,
      exports: options.repositories.map(({ provide }) => provide),
    }
  }
}
