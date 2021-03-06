require('dotenv').config({ path: '../.env' });
process.env.BACKEND_URL = '';
process.env.DB_HOST = 'localhost';
process.env.DB_NAME = 'crossfeed_test';
process.env.IS_LOCAL = 'true';
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  modulePathIgnorePatterns: ['<rootDir>/.build/'],
  globalSetup: '<rootDir>/test/setup.ts',
  clearMocks: true
};
