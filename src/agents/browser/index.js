/**
 * @fileoverview Browser Agent - Natural Language Browser Automation
 * @module agents/browser
 * @description Provides browser automation through natural language commands,
 * screenshot capture and comparison, and E2E test generation.
 */

const { chromium, firefox, webkit } = require('playwright');
const NLParser = require('./nl-parser');
const ActionExecutor = require('./action-executor');
const ContextManager = require('./context-manager');
const ScreenshotCapture = require('./screenshot');
const AIComparator = require('./ai-comparator');
const TestGenerator = require('./test-generator');

/**
 * @typedef {Object} BrowserAgentOptions
 * @property {boolean} [headless=true] - Run browser in headless mode
 * @property {'chromium'|'firefox'|'webkit'} [browser='chromium'] - Browser type
 * @property {string} [outputDir='./screenshots'] - Screenshot output directory
 * @property {string} [visionModel='gpt-4-vision-preview'] - Vision AI model
 * @property {number} [timeout=30000] - Default timeout in milliseconds
 * @property {number} [threshold=0.95] - Screenshot comparison threshold
 */

/**
 * Browser Agent for natural language browser automation
 */
class BrowserAgent {
  /**
   * Create a new BrowserAgent instance
   * @param {BrowserAgentOptions} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      headless: options.headless !== false,
      browser: options.browser || 'chromium',
      outputDir: options.outputDir || './screenshots',
      visionModel: options.visionModel || 'gpt-4-vision-preview',
      timeout: options.timeout || 30000,
      threshold: options.threshold || 0.95,
    };

    this.parser = new NLParser();
    this.executor = new ActionExecutor();
    this.contextManager = new ContextManager();
    this.screenshot = new ScreenshotCapture(this.options.outputDir);
    this.comparator = new AIComparator({
      model: this.options.visionModel,
      threshold: this.options.threshold,
    });
    this.testGenerator = new TestGenerator();

    this.browser = null;
    this.isLaunched = false;
  }

  /**
   * Launch the browser
   * @returns {Promise<void>}
   */
  async launch() {
    if (this.isLaunched) {
      return;
    }

    const browserType = this.getBrowserType();
    this.browser = await browserType.launch({
      headless: this.options.headless,
    });

    await this.contextManager.initialize(this.browser);
    this.isLaunched = true;
  }

  /**
   * Get the Playwright browser type
   * @returns {import('playwright').BrowserType}
   * @private
   */
  getBrowserType() {
    switch (this.options.browser) {
      case 'firefox':
        return firefox;
      case 'webkit':
        return webkit;
      case 'chromium':
      default:
        return chromium;
    }
  }

  /**
   * Execute a natural language command
   * @param {string} command - Natural language command
   * @returns {Promise<import('./action-executor').ActionResult>}
   */
  async execute(command) {
    if (!this.isLaunched) {
      await this.launch();
    }

    // Parse natural language to actions
    const parseResult = this.parser.parse(command);
    
    if (!parseResult.success) {
      return {
        success: false,
        error: parseResult.error,
        command,
      };
    }

    // Get current page context
    const page = await this.contextManager.getOrCreatePage();

    // Execute each action
    const results = [];
    for (const action of parseResult.actions) {
      const result = await this.executor.execute(action, {
        page,
        screenshot: this.screenshot,
        timeout: this.options.timeout,
      });
      
      results.push(result);
      
      if (!result.success) {
        return {
          success: false,
          error: result.error,
          action,
          results,
        };
      }
    }

    return {
      success: true,
      command,
      actions: parseResult.actions,
      results,
    };
  }

  /**
   * Execute multiple commands in sequence
   * @param {string[]} commands - Array of natural language commands
   * @returns {Promise<Object>}
   */
  async executeSequence(commands) {
    const results = [];
    
    for (const command of commands) {
      const result = await this.execute(command);
      results.push(result);
      
      if (!result.success) {
        return {
          success: false,
          error: result.error,
          completedCommands: results.length - 1,
          results,
        };
      }
    }

    return {
      success: true,
      totalCommands: commands.length,
      results,
    };
  }

  /**
   * Take a screenshot of the current page
   * @param {Object} options - Screenshot options
   * @param {string} [options.name] - Screenshot name
   * @param {boolean} [options.fullPage=false] - Capture full page
   * @returns {Promise<string>} Screenshot file path
   */
  async takeScreenshot(options = {}) {
    if (!this.isLaunched) {
      throw new Error('Browser not launched. Call launch() first.');
    }

    const page = await this.contextManager.getOrCreatePage();
    return this.screenshot.capture(page, options);
  }

  /**
   * Compare two screenshots using AI
   * @param {string} expected - Path to expected screenshot
   * @param {string} actual - Path to actual screenshot
   * @param {Object} options - Comparison options
   * @param {number} [options.threshold] - Similarity threshold
   * @param {string} [options.description] - What to verify
   * @returns {Promise<import('./ai-comparator').ComparisonResult>}
   */
  async compare(expected, actual, options = {}) {
    return this.comparator.compare(expected, actual, {
      threshold: options.threshold || this.options.threshold,
      description: options.description,
    });
  }

  /**
   * Generate Playwright test code from action history
   * @param {Object} options - Generation options
   * @param {string} [options.name] - Test name
   * @param {string} [options.output] - Output file path
   * @returns {Promise<string>} Generated test code
   */
  async generateTest(options = {}) {
    const history = this.contextManager.getActionHistory();
    return this.testGenerator.generateTest(history, options);
  }

  /**
   * Get the current page
   * @returns {Promise<import('playwright').Page>}
   */
  async getPage() {
    if (!this.isLaunched) {
      await this.launch();
    }
    return this.contextManager.getOrCreatePage();
  }

  /**
   * Get action history
   * @returns {Array<import('./action-executor').Action>}
   */
  getActionHistory() {
    return this.contextManager.getActionHistory();
  }

  /**
   * Clear action history
   */
  clearHistory() {
    this.contextManager.clearHistory();
  }

  /**
   * Close the browser
   * @returns {Promise<void>}
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.isLaunched = false;
      this.contextManager.reset();
    }
  }
}

module.exports = BrowserAgent;
module.exports.NLParser = NLParser;
module.exports.ActionExecutor = ActionExecutor;
module.exports.ContextManager = ContextManager;
module.exports.ScreenshotCapture = ScreenshotCapture;
module.exports.AIComparator = AIComparator;
module.exports.TestGenerator = TestGenerator;
