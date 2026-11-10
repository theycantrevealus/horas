import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

/**
 * Resolves a folder of the back-end project to an absolute path.
 *
 * @param folder - Folder relative to this file.
 * @returns The absolute path.
 */
const path = (folder: string): string =>
  fileURLToPath(new URL(folder, import.meta.url))

export default defineConfig({
  // Resolves the path aliases declared in the app tsconfig files. Shared folders
  // (apps/utility, apps/repository, apps/configuration, apps/identity, apps/workforce) are not in any tsconfig
  // `include`, so their aliases and decorator settings are also declared here.
  resolve: {
    tsconfigPaths: true,
    alias: {
      '@utility': path('./apps/utility'),
      '@configuration': path('./apps/configuration'),
      '@repository': path('./apps/repository'),
      '@identity': path('./apps/identity'),
      '@workforce': path('./apps/workforce'),
    },
  },
  oxc: { decorator: { legacy: true, emitDecoratorMetadata: true } },
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
  },
})
