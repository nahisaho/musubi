/**
 * @fileoverview Tests for NL Parser
 * @module tests/agents/browser/nl-parser.test.js
 */

const NLParser = require('../../../src/agents/browser/nl-parser');

describe('NLParser', () => {
  let parser;

  beforeEach(() => {
    parser = new NLParser();
  });

  describe('parse', () => {
    test('should parse navigate command (Japanese)', () => {
      const result = parser.parse('https://example.com を開く');
      
      expect(result.success).toBe(true);
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].type).toBe('navigate');
      expect(result.actions[0].url).toBe('https://example.com');
    });

    test('should parse navigate command (English)', () => {
      const result = parser.parse('go to https://example.com');
      
      expect(result.success).toBe(true);
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].type).toBe('navigate');
      expect(result.actions[0].url).toBe('https://example.com');
    });

    test('should parse click command (Japanese)', () => {
      const result = parser.parse('ログインボタンをクリック');
      
      expect(result.success).toBe(true);
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].type).toBe('click');
      expect(result.actions[0].selector).toContain('login');
    });

    test('should parse click command (English)', () => {
      const result = parser.parse('click login button');
      
      expect(result.success).toBe(true);
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].type).toBe('click');
    });

    test('should parse fill command (Japanese)', () => {
      const result = parser.parse('メール欄に「test@example.com」と入力');
      
      expect(result.success).toBe(true);
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].type).toBe('fill');
      expect(result.actions[0].value).toBe('test@example.com');
    });

    test('should parse fill command (English)', () => {
      const result = parser.parse('type "hello world" in email field');
      
      expect(result.success).toBe(true);
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].type).toBe('fill');
      expect(result.actions[0].value).toBe('hello world');
    });

    test('should parse wait command (Japanese)', () => {
      const result = parser.parse('3秒待つ');
      
      expect(result.success).toBe(true);
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].type).toBe('wait');
      expect(result.actions[0].delay).toBe(3000);
    });

    test('should parse wait command (English)', () => {
      const result = parser.parse('wait 5 seconds');
      
      expect(result.success).toBe(true);
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].type).toBe('wait');
      expect(result.actions[0].delay).toBe(5000);
    });

    test('should parse screenshot command (Japanese)', () => {
      const result = parser.parse('スクリーンショットを取る');
      
      expect(result.success).toBe(true);
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].type).toBe('screenshot');
    });

    test('should parse screenshot with name (Japanese)', () => {
      const result = parser.parse('画面を「login-page」として保存');
      
      expect(result.success).toBe(true);
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].type).toBe('screenshot');
      expect(result.actions[0].name).toBe('login-page');
    });

    test('should parse assert command (Japanese)', () => {
      const result = parser.parse('「ログイン成功」が表示される');
      
      expect(result.success).toBe(true);
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].type).toBe('assert');
      expect(result.actions[0].expectedText).toBe('ログイン成功');
    });

    test('should parse multiple commands separated by comma', () => {
      const result = parser.parse('https://example.com を開く、ログインボタンをクリック');
      
      expect(result.success).toBe(true);
      expect(result.actions).toHaveLength(2);
      expect(result.actions[0].type).toBe('navigate');
      expect(result.actions[1].type).toBe('click');
    });

    test('should parse multiple commands with "and"', () => {
      const result = parser.parse('go to https://example.com and click login button');
      
      expect(result.success).toBe(true);
      expect(result.actions).toHaveLength(2);
    });

    test('should return error for unrecognized command', () => {
      const result = parser.parse('do something unknown');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('normalizeCommand', () => {
    test('should trim whitespace', () => {
      const result = parser.normalizeCommand('  hello world  ');
      expect(result).toBe('hello world');
    });

    test('should normalize Japanese punctuation', () => {
      const result = parser.normalizeCommand('こんにちは、世界。');
      expect(result).toBe('こんにちは,世界.');
    });
  });

  describe('extractSelector', () => {
    test('should match known element patterns (Japanese)', () => {
      const selector = parser.extractSelector('ログインボタン');
      expect(selector).toContain('login');
    });

    test('should match known element patterns (English)', () => {
      const selector = parser.extractSelector('email field');
      expect(selector).toContain('email');
    });

    test('should extract CSS selectors', () => {
      const selector = parser.extractSelector('#myId element');
      expect(selector).toBe('#myId');
    });

    test('should extract data-testid', () => {
      const selector = parser.extractSelector('data-testid="submit-btn"');
      expect(selector).toBe('[data-testid="submit-btn"]');
    });
  });

  describe('addElementPattern', () => {
    test('should add custom element pattern', () => {
      parser.addElementPattern('custom button', '#custom-button');
      const selector = parser.extractSelector('custom button');
      expect(selector).toBe('#custom-button');
    });
  });

  describe('getSupportedActions', () => {
    test('should return all action types', () => {
      const actions = parser.getSupportedActions();
      expect(actions).toContain('navigate');
      expect(actions).toContain('click');
      expect(actions).toContain('fill');
      expect(actions).toContain('wait');
      expect(actions).toContain('screenshot');
      expect(actions).toContain('assert');
    });
  });
});
