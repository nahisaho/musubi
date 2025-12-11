/**
 * Mock for better-sqlite3
 * Used in tests that involve CodeGraph MCP integration
 */

class MockStatement {
  constructor() {
    this.mockData = {
      get: { count: 0 },
      all: [],
    };
  }

  get() {
    return this.mockData.get;
  }

  all() {
    return this.mockData.all;
  }

  run() {
    return { changes: 0, lastInsertRowid: 0 };
  }
}

class MockDatabase {
  constructor() {
    this.isOpen = true;
  }

  prepare() {
    return new MockStatement();
  }

  close() {
    this.isOpen = false;
  }

  exec() {
    return this;
  }

  transaction(fn) {
    return fn;
  }
}

module.exports = function (_filename, _options) {
  return new MockDatabase();
};

module.exports.MockDatabase = MockDatabase;
module.exports.MockStatement = MockStatement;
