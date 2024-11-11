import {defineConfig} from 'cypress'
import webpackConfig from './webpack.config'

export default defineConfig({
  projectId: '2tp2jb',
  chromeWebSecurity: false,
  fixturesFolder: '__tests__/e2e/fixtures',
  screenshotsFolder: '__tests__/e2e/screenshots',
  videosFolder: '__tests__/e2e/videos',

  e2e: {
    baseUrl: process.env.BASE_URL,
    setupNodeEvents(on, config) {
      return require('./__tests__/e2e/plugins/index.js')(on, config)
    },
    specPattern: '__tests__/e2e/specs/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: '__tests__/e2e/support/index.js',
  },

  component: {
    devServer: {
      framework: 'vue-cli',
      bundler: 'webpack',
      webpackConfig,
    },
  },
})
