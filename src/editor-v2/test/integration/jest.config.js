/**
 * Jest configuration for EditorV2 integration tests
 * Configures JSDOM environment for testing DOM-based editor functionality
 */

module.exports = {
  displayName: 'EditorV2 Integration Tests',
  testEnvironment: 'jsdom',
  testMatch: [
    '<rootDir>/*.test.ts',
    '<rootDir>/*.test.js'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../../../../$1',
    '\\.css$': '<rootDir>/__mocks__/styleMock.js'
  },
  setupFilesAfterEnv: ['<rootDir>/setup.js'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        moduleResolution: 'node'
      }
    }]
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: [
    '../../**/*.{ts,tsx}',
    '!../../**/*.test.{ts,tsx}',
    '!../../**/*.d.ts',
    '!../../test/**'
  ]
};