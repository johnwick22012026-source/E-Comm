import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'json'],
  rootDir: './',
  testRegex: '.*\.spec\.ts$',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.spec.json',
    },
  },
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  collectCoverage: false,
  coveragePathIgnorePatterns: ['/node_modules/'],
}

export default config
