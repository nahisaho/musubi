/**
 * @fileoverview Integration tests for BrowserAgent
 */

const BrowserAgent = require('../../../src/agents/browser');

describe('BrowserAgent', () => {
  let agent;

  beforeEach(() => {
    agent = new BrowserAgent({
      headless: true,
      browser: 'chromium',
    });
  });

  afterEach(async () => {
    if (agent) {
      await agent.close();
    }
  });

  describe('constructor', () => {
    it('should create instance with default options', () => {
      const defaultAgent = new BrowserAgent();
      expect(defaultAgent.options.headless).toBe(true);
      expect(defaultAgent.options.browser).toBe('chromium');
      expect(defaultAgent.options.timeout).toBe(30000);
    });

    it('should accept custom options', () => {
      const customAgent = new BrowserAgent({
        headless: false,
        browser: 'firefox',
        timeout: 10000,
        outputDir: './custom-screenshots',
      });
      expect(customAgent.options.headless).toBe(false);
      expect(customAgent.options.browser).toBe('firefox');
      expect(customAgent.options.timeout).toBe(10000);
      expect(customAgent.options.outputDir).toBe('./custom-screenshots');
    });

    it('should initialize all components', () => {
      expect(agent.parser).toBeDefined();
      expect(agent.executor).toBeDefined();
      expect(agent.contextManager).toBeDefined();
      expect(agent.screenshot).toBeDefined();
      expect(agent.comparator).toBeDefined();
      expect(agent.testGenerator).toBeDefined();
    });
  });

  describe('getBrowserType', () => {
    it('should return chromium by default', () => {
      const browserType = agent.getBrowserType();
      expect(browserType.name()).toBe('chromium');
    });

    it('should return firefox when specified', () => {
      const firefoxAgent = new BrowserAgent({ browser: 'firefox' });
      const browserType = firefoxAgent.getBrowserType();
      expect(browserType.name()).toBe('firefox');
    });

    it('should return webkit when specified', () => {
      const webkitAgent = new BrowserAgent({ browser: 'webkit' });
      const browserType = webkitAgent.getBrowserType();
      expect(browserType.name()).toBe('webkit');
    });
  });

  describe('launch and close', () => {
    it('should not be launched initially', () => {
      expect(agent.isLaunched).toBe(false);
    });

    // Note: Actual browser launch tests require Playwright browsers installed
    // These are integration tests that would run in CI with proper setup
  });

  describe('execute without browser', () => {
    it('should return error for unparseable command', async () => {
      // Mock launch to avoid actual browser startup
      agent.launch = jest.fn().mockResolvedValue(undefined);
      agent.isLaunched = true;
      
      // Parser returns error for gibberish
      const result = await agent.execute('asdfghjkl qwerty');
      expect(result.success).toBe(false);
    });
  });

  describe('executeSequence', () => {
    it('should return all results', async () => {
      // Mock methods
      agent.launch = jest.fn().mockResolvedValue(undefined);
      agent.execute = jest.fn()
        .mockResolvedValueOnce({ success: true, command: 'cmd1' })
        .mockResolvedValueOnce({ success: true, command: 'cmd2' });

      const result = await agent.executeSequence(['cmd1', 'cmd2']);
      expect(result.success).toBe(true);
      expect(result.totalCommands).toBe(2);
      expect(result.results).toHaveLength(2);
    });

    it('should stop on first failure', async () => {
      agent.launch = jest.fn().mockResolvedValue(undefined);
      agent.execute = jest.fn()
        .mockResolvedValueOnce({ success: true, command: 'cmd1' })
        .mockResolvedValueOnce({ success: false, error: 'Failed' })
        .mockResolvedValueOnce({ success: true, command: 'cmd3' });

      const result = await agent.executeSequence(['cmd1', 'cmd2', 'cmd3']);
      expect(result.success).toBe(false);
      expect(result.completedCommands).toBe(1);
      expect(result.results).toHaveLength(2);
    });
  });

  describe('takeScreenshot', () => {
    it('should throw if browser not launched', async () => {
      await expect(agent.takeScreenshot()).rejects.toThrow('Browser not launched');
    });
  });

  describe('getActionHistory', () => {
    it('should return empty history initially', () => {
      expect(agent.getActionHistory()).toEqual([]);
    });
  });

  describe('clearHistory', () => {
    it('should clear history', () => {
      agent.contextManager.recordAction({ type: 'test' }, { success: true });
      expect(agent.getActionHistory()).toHaveLength(1);
      
      agent.clearHistory();
      expect(agent.getActionHistory()).toEqual([]);
    });
  });

  describe('compare', () => {
    it('should use AI comparator', async () => {
      // Mock comparator
      agent.comparator.compare = jest.fn().mockResolvedValue({
        passed: true,
        similarity: 98,
      });

      const result = await agent.compare('expected.png', 'actual.png', {
        description: 'Login page comparison',
      });

      expect(result.passed).toBe(true);
      expect(agent.comparator.compare).toHaveBeenCalledWith('expected.png', 'actual.png', {
        threshold: 0.95,
        description: 'Login page comparison',
      });
    });
  });

  describe('generateTest', () => {
    it('should generate test from history', async () => {
      // Add some history
      agent.contextManager.recordAction(
        { type: 'navigate', url: 'https://example.com' },
        { success: true }
      );
      agent.contextManager.recordAction(
        { type: 'click', selector: '#button' },
        { success: true }
      );

      const code = await agent.generateTest({ name: 'Test Case' });
      expect(code).toContain('test(');
      expect(code).toContain('goto'); // navigate action becomes page.goto
      expect(code).toContain('click');
    });
  });

  describe('module exports', () => {
    it('should export all components', () => {
      expect(BrowserAgent.NLParser).toBeDefined();
      expect(BrowserAgent.ActionExecutor).toBeDefined();
      expect(BrowserAgent.ContextManager).toBeDefined();
      expect(BrowserAgent.ScreenshotCapture).toBeDefined();
      expect(BrowserAgent.AIComparator).toBeDefined();
      expect(BrowserAgent.TestGenerator).toBeDefined();
    });
  });
});
