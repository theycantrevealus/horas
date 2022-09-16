import { defineConfig } from 'cypress'

export default defineConfig({
  chromeWebSecurity: false,
  compontent: {
    componentFolder: 'src',
    testFiles: '**/*.spec.ts',
  },
  fixturesFolder: '__tests__/e2e/fixtures',
  screenshotsFolder: '__tests__/e2e/screenshots',
  videosFolder: '__tests__/e2e/videos',
  e2e: {
    // We've imported your old cypress plugins here.
    // You may want to clean this up later by importing these.
    setupNodeEvents(on, config) {
      return require('./__tests__/e2e/plugins/index.js')(on, config)
    },
    specPattern: '__tests__/e2e/specs/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: '__tests__/e2e/support/index.js',
  },
})
