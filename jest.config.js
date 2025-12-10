module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/templates/**',  // Exclude templates from coverage
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 45,
      functions: 60,
      lines: 60,
      statements: 60
    }
  },
  testMatch: [
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.js'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/e2e/ollama-e2e.test.js'  // Run with: node tests/e2e/ollama-e2e.test.js
  ],
  verbose: true,
  // Prevent coverage worker issues with temp directories
  maxWorkers: 1
};
