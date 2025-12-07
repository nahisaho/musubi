/**
 * @fileoverview Tests for Test Generator
 * @module tests/agents/browser/test-generator.test.js
 */

const TestGenerator = require('../../../src/agents/browser/test-generator');

describe('TestGenerator', () => {
  let generator;

  beforeEach(() => {
    generator = new TestGenerator();
  });

  describe('generateTest', () => {
    test('should generate Playwright test from history', async () => {
      const history = [
        {
          action: { type: 'navigate', url: 'https://example.com' },
          result: { success: true },
        },
        {
          action: { type: 'click', selector: '#login-button' },
          result: { success: true },
        },
        {
          action: { type: 'fill', selector: 'input[name="email"]', value: 'test@example.com' },
          result: { success: true },
        },
      ];

      const code = await generator.generateTest(history, { name: 'Login Test' });

      expect(code).toContain("import { test, expect } from '@playwright/test'");
      expect(code).toContain("test('Login Test'");
      expect(code).toContain("await page.goto('https://example.com')");
      expect(code).toContain("await page.click('#login-button')");
      expect(code).toContain("await page.fill('input[name=\"email\"]', 'test@example.com')");
    });

    test('should generate Jest/Puppeteer test', async () => {
      const history = [
        {
          action: { type: 'navigate', url: 'https://example.com' },
          result: { success: true },
        },
      ];

      const code = await generator.generateTest(history, { 
        name: 'My Test',
        format: 'jest',
      });

      expect(code).toContain("const puppeteer = require('puppeteer')");
      expect(code).toContain("describe('My Test'");
      expect(code).toContain("beforeAll");
      expect(code).toContain("afterAll");
    });
  });

  describe('actionToPlaywrightCode', () => {
    test('should convert navigate action', () => {
      const code = generator.actionToPlaywrightCode({
        type: 'navigate',
        url: 'https://example.com',
      });
      expect(code).toBe("await page.goto('https://example.com');");
    });

    test('should convert click action', () => {
      const code = generator.actionToPlaywrightCode({
        type: 'click',
        selector: '#button',
      });
      expect(code).toBe("await page.click('#button');");
    });

    test('should convert fill action', () => {
      const code = generator.actionToPlaywrightCode({
        type: 'fill',
        selector: 'input',
        value: 'test',
      });
      expect(code).toBe("await page.fill('input', 'test');");
    });

    test('should convert select action', () => {
      const code = generator.actionToPlaywrightCode({
        type: 'select',
        selector: 'select',
        value: 'option1',
      });
      expect(code).toBe("await page.selectOption('select', 'option1');");
    });

    test('should convert wait action', () => {
      const code = generator.actionToPlaywrightCode({
        type: 'wait',
        delay: 1000,
      });
      expect(code).toBe('await page.waitForTimeout(1000);');
    });

    test('should convert screenshot action', () => {
      const code = generator.actionToPlaywrightCode({
        type: 'screenshot',
        name: 'login-page',
        fullPage: true,
      });
      expect(code).toContain("await page.screenshot");
      expect(code).toContain("login-page.png");
      expect(code).toContain("fullPage: true");
    });

    test('should convert assert action with text', () => {
      const code = generator.actionToPlaywrightCode({
        type: 'assert',
        expectedText: 'Welcome',
      });
      expect(code).toContain("await expect");
      expect(code).toContain("toBeVisible");
    });

    test('should handle unknown action', () => {
      const code = generator.actionToPlaywrightCode({
        type: 'unknown',
      });
      expect(code).toContain('// Unknown action');
    });
  });

  describe('generateFromSpec', () => {
    test('should generate tests from MUSUBI specification', () => {
      const spec = {
        title: 'Authentication Feature',
        requirements: [
          {
            id: 'REQ-001',
            title: 'User Login',
            pattern: 'event-driven',
            trigger: 'user submits credentials',
            action: 'create session',
            statement: 'WHEN user submits credentials, the system SHALL create session',
          },
          {
            id: 'REQ-002',
            title: 'Session Expiry',
            pattern: 'ubiquitous',
            action: 'expire sessions after 24 hours',
            statement: 'The system SHALL expire sessions after 24 hours',
          },
        ],
      };

      const code = generator.generateFromSpec(spec);

      expect(code).toContain("import { test, expect } from '@playwright/test'");
      expect(code).toContain('REQ-001');
      expect(code).toContain('REQ-002');
      expect(code).toContain('Pattern: event-driven');
      expect(code).toContain('Pattern: ubiquitous');
    });
  });

  describe('escapeString', () => {
    test('should escape single quotes', () => {
      expect(generator.escapeString("it's")).toBe("it\\'s");
    });

    test('should escape double quotes', () => {
      expect(generator.escapeString('say "hello"')).toBe('say \\"hello\\"');
    });

    test('should escape newlines', () => {
      expect(generator.escapeString("line1\nline2")).toBe("line1\\nline2");
    });

    test('should handle empty string', () => {
      expect(generator.escapeString('')).toBe('');
    });

    test('should handle null/undefined', () => {
      expect(generator.escapeString(null)).toBe('');
      expect(generator.escapeString(undefined)).toBe('');
    });
  });

  describe('escapeSelector', () => {
    test('should escape single quotes in selector', () => {
      expect(generator.escapeSelector("text='hello'")).toBe("text=\\'hello\\'");
    });

    test('should return * for empty selector', () => {
      expect(generator.escapeSelector('')).toBe('*');
      expect(generator.escapeSelector(null)).toBe('*');
    });
  });
});
