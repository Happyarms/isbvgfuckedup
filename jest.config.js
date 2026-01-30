export default {
  // Use jsdom environment for DOM testing
  testEnvironment: 'jsdom',

  // Transform settings for ES modules
  transform: {},

  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.js'
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'js/app-logic.js',
    '!js/**/*.test.js',
    '!**/node_modules/**',
    '!**/vendor/**'
  ],

  // Coverage thresholds (70% minimum as per spec)
  coverageThreshold: {
    global: {
      lines: 70,
      functions: 70,
      branches: 70,
      statements: 70
    }
  },

  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov'
  ],

  // Setup files to run before tests
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/'
  ],

  // Module paths
  moduleDirectories: [
    'node_modules',
    '<rootDir>'
  ],

  // Verbose output for better debugging
  verbose: true,

  // Clear mocks automatically between tests
  clearMocks: true,

  // Indicates whether each test should be reported during the run
  notify: false,

  // Automatically reset mock state before every test
  resetMocks: false,

  // Automatically restore mock state before every test
  restoreMocks: true
};
