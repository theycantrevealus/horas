import type { Config } from '@jest/types'

const config: Config.InitialOptions = {
  roots: [
    '<rootDir>/src/',
    '<rootDir>/__tests__/unit'
  ],
  verbose: true,
  moduleNameMapper: {
    '@/(.*)$': '<rootDir>/src/$1'
  },
  moduleFileExtensions: [
    'js', 'json', 'vue', 'ts'
  ],
  transform: {
    '.*\\.(vue)$': 'vue3-jest',
    '.*\\.(ts)$': 'ts-jest',
    '.*\\.(js)$': 'babel-jest'
  },
  testPathIgnorePatterns: [
    '.eslintrc.js'
  ],
  testEnvironment: 'jsdom',
  collectCoverage: true,
  collectCoverageFrom: ['**/*.spec.{js,vue,ts}', '!**/node_modules/**']
}
export default config
