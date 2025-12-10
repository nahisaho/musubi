/**
 * @fileoverview Test Code Generator for Browser Automation
 * @module agents/browser/test-generator
 */

const path = require('path');
const fs = require('fs-extra');

/**
 * Test Code Generator - Generates Playwright test code from action history
 */
class TestGenerator {
  constructor() {
    this.templates = {
      playwright: this.generatePlaywrightTest.bind(this),
      jest: this.generateJestTest.bind(this),
    };
  }

  /**
   * Generate test code from action history
   * @param {Array} history - Action history
   * @param {Object} options - Generation options
   * @param {string} [options.name='Generated Test'] - Test name
   * @param {string} [options.format='playwright'] - Test format
   * @param {string} [options.output] - Output file path
   * @returns {Promise<string>} Generated test code
   */
  async generateTest(history, options = {}) {
    const format = options.format || 'playwright';
    const generator = this.templates[format];

    if (!generator) {
      throw new Error(`Unknown test format: ${format}`);
    }

    const code = generator(history, options);

    if (options.output) {
      await fs.ensureDir(path.dirname(options.output));
      await fs.writeFile(options.output, code, 'utf-8');
    }

    return code;
  }

  /**
   * Generate Playwright test
   * @param {Array} history
   * @param {Object} options
   * @returns {string}
   */
  generatePlaywrightTest(history, options = {}) {
    const testName = options.name || 'Generated Test';
    const lines = [
      `import { test, expect } from '@playwright/test';`,
      ``,
      `test('${this.escapeString(testName)}', async ({ page }) => {`,
    ];

    for (const item of history) {
      const action = item.action;
      const code = this.actionToPlaywrightCode(action);
      if (code) {
        lines.push(`  ${code}`);
      }
    }

    lines.push(`});`);
    lines.push(``);

    return lines.join('\n');
  }

  /**
   * Convert action to Playwright code
   * @param {Object} action
   * @returns {string}
   */
  actionToPlaywrightCode(action) {
    switch (action.type) {
      case 'navigate':
        return `await page.goto('${this.escapeString(action.url)}');`;

      case 'click':
        return `await page.click('${this.escapeSelector(action.selector)}');`;

      case 'fill':
        return `await page.fill('${this.escapeSelector(action.selector)}', '${this.escapeString(action.value)}');`;

      case 'select':
        return `await page.selectOption('${this.escapeSelector(action.selector)}', '${this.escapeString(action.value)}');`;

      case 'wait':
        return `await page.waitForTimeout(${action.delay});`;

      case 'screenshot': {
        const name = action.name || 'screenshot';
        return `await page.screenshot({ path: 'screenshots/${name}.png'${action.fullPage ? ', fullPage: true' : ''} });`;
      }

      case 'assert':
        if (action.expectedText) {
          return `await expect(page.locator('text="${this.escapeString(action.expectedText)}"')).toBeVisible();`;
        }
        return `await expect(page.locator('${this.escapeSelector(action.selector)}')).toBeVisible();`;

      default:
        return `// Unknown action: ${action.type}`;
    }
  }

  /**
   * Generate Jest + Puppeteer style test
   * @param {Array} history
   * @param {Object} options
   * @returns {string}
   */
  generateJestTest(history, options = {}) {
    const testName = options.name || 'Generated Test';
    const lines = [
      `const puppeteer = require('puppeteer');`,
      ``,
      `describe('${this.escapeString(testName)}', () => {`,
      `  let browser;`,
      `  let page;`,
      ``,
      `  beforeAll(async () => {`,
      `    browser = await puppeteer.launch();`,
      `    page = await browser.newPage();`,
      `  });`,
      ``,
      `  afterAll(async () => {`,
      `    await browser.close();`,
      `  });`,
      ``,
      `  test('should complete flow', async () => {`,
    ];

    for (const item of history) {
      const action = item.action;
      const code = this.actionToPuppeteerCode(action);
      if (code) {
        lines.push(`    ${code}`);
      }
    }

    lines.push(`  });`);
    lines.push(`});`);
    lines.push(``);

    return lines.join('\n');
  }

  /**
   * Convert action to Puppeteer code
   * @param {Object} action
   * @returns {string}
   */
  actionToPuppeteerCode(action) {
    switch (action.type) {
      case 'navigate':
        return `await page.goto('${this.escapeString(action.url)}');`;

      case 'click':
        return `await page.click('${this.escapeSelector(action.selector)}');`;

      case 'fill':
        return `await page.type('${this.escapeSelector(action.selector)}', '${this.escapeString(action.value)}');`;

      case 'select':
        return `await page.select('${this.escapeSelector(action.selector)}', '${this.escapeString(action.value)}');`;

      case 'wait':
        return `await new Promise(r => setTimeout(r, ${action.delay}));`;

      case 'screenshot': {
        const name = action.name || 'screenshot';
        return `await page.screenshot({ path: 'screenshots/${name}.png'${action.fullPage ? ', fullPage: true' : ''} });`;
      }

      case 'assert':
        return `await page.waitForSelector('${this.escapeSelector(action.selector)}');`;

      default:
        return `// Unknown action: ${action.type}`;
    }
  }

  /**
   * Generate test from MUSUBI specification
   * @param {Object} specification - MUSUBI specification
   * @param {Object} options
   * @returns {string}
   */
  generateFromSpec(specification, _options = {}) {
    const lines = [
      `import { test, expect } from '@playwright/test';`,
      ``,
      `/**`,
      ` * Tests generated from MUSUBI specification: ${specification.title || 'Unknown'}`,
      ` */`,
      ``,
    ];

    for (const req of specification.requirements || []) {
      const testCode = this.requirementToTest(req);
      lines.push(testCode);
      lines.push(``);
    }

    return lines.join('\n');
  }

  /**
   * Convert a requirement to a test
   * @param {Object} requirement
   * @returns {string}
   */
  requirementToTest(requirement) {
    const testName = `${requirement.id}: ${requirement.title || requirement.action || 'Requirement'}`;
    
    const lines = [
      `test('${this.escapeString(testName)}', async ({ page }) => {`,
      `  // Pattern: ${requirement.pattern}`,
      `  // Statement: ${requirement.statement || ''}`,
      `  `,
      `  // TODO: Implement test based on requirement`,
    ];

    // Add hints based on pattern
    if (requirement.pattern === 'event-driven' && requirement.trigger) {
      lines.push(`  // Trigger: ${requirement.trigger}`);
      lines.push(`  // Action: ${requirement.action}`);
    } else if (requirement.pattern === 'state-driven' && requirement.condition) {
      lines.push(`  // Condition: ${requirement.condition}`);
      lines.push(`  // Action: ${requirement.action}`);
    }

    lines.push(`  `);
    lines.push(`  throw new Error('Test not implemented');`);
    lines.push(`});`);

    return lines.join('\n');
  }

  /**
   * Escape a string for JavaScript
   * @param {string} str
   * @returns {string}
   */
  escapeString(str) {
    if (!str) return '';
    return str
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r');
  }

  /**
   * Escape a CSS selector for JavaScript
   * @param {string} selector
   * @returns {string}
   */
  escapeSelector(selector) {
    if (!selector) return '*';
    return selector.replace(/'/g, "\\'");
  }
}

module.exports = TestGenerator;
