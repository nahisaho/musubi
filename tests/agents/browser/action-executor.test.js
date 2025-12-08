/**
 * @fileoverview Unit tests for ActionExecutor
 */

const ActionExecutor = require('../../../src/agents/browser/action-executor');

describe('ActionExecutor', () => {
  let executor;
  let mockPage;
  let mockScreenshot;
  let mockContext;

  beforeEach(() => {
    executor = new ActionExecutor();
    
    mockPage = {
      goto: jest.fn().mockResolvedValue(undefined),
      url: jest.fn().mockReturnValue('https://example.com'),
      click: jest.fn().mockResolvedValue(undefined),
      fill: jest.fn().mockResolvedValue(undefined),
      selectOption: jest.fn().mockResolvedValue(undefined),
      locator: jest.fn().mockReturnValue({
        waitFor: jest.fn().mockResolvedValue(undefined),
        textContent: jest.fn().mockResolvedValue('Hello World'),
      }),
    };

    mockScreenshot = {
      capture: jest.fn().mockResolvedValue('/path/to/screenshot.png'),
    };

    mockContext = {
      page: mockPage,
      screenshot: mockScreenshot,
      timeout: 5000,
    };
  });

  describe('execute', () => {
    it('should return error for unknown action type', async () => {
      const action = { type: 'unknown-action' };
      const result = await executor.execute(action, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action type');
    });

    it('should catch and return errors', async () => {
      mockPage.goto.mockRejectedValue(new Error('Navigation failed'));
      
      const action = { type: 'navigate', url: 'https://example.com' };
      const result = await executor.execute(action, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Navigation failed');
    });
  });

  describe('executeNavigate', () => {
    it('should navigate to URL', async () => {
      const action = { type: 'navigate', url: 'https://example.com' };
      const result = await executor.execute(action, mockContext);

      expect(result.success).toBe(true);
      expect(result.type).toBe('navigate');
      expect(mockPage.goto).toHaveBeenCalledWith('https://example.com', {
        timeout: 5000,
        waitUntil: 'domcontentloaded',
      });
    });

    it('should return current URL in result', async () => {
      mockPage.url.mockReturnValue('https://example.com/redirect');
      
      const action = { type: 'navigate', url: 'https://example.com' };
      const result = await executor.execute(action, mockContext);

      expect(result.data.currentUrl).toBe('https://example.com/redirect');
    });
  });

  describe('executeClick', () => {
    it('should click element by selector', async () => {
      const action = { type: 'click', selector: '#button' };
      const result = await executor.execute(action, mockContext);

      expect(result.success).toBe(true);
      expect(result.type).toBe('click');
      expect(mockPage.click).toHaveBeenCalledWith('#button', { timeout: 5000 });
    });

    it('should try multiple selectors', async () => {
      mockPage.click
        .mockRejectedValueOnce(new Error('Not found'))
        .mockResolvedValueOnce(undefined);
      
      const action = { type: 'click', selector: '#button1, #button2' };
      const result = await executor.execute(action, mockContext);

      expect(result.success).toBe(true);
      expect(result.data.selector).toBe('#button2');
    });
  });

  describe('executeFill', () => {
    it('should fill input field', async () => {
      const action = { type: 'fill', selector: '#email', value: 'test@example.com' };
      const result = await executor.execute(action, mockContext);

      expect(result.success).toBe(true);
      expect(result.type).toBe('fill');
      expect(mockPage.fill).toHaveBeenCalledWith('#email', 'test@example.com', { timeout: 5000 });
    });

    it('should try multiple selectors for fill', async () => {
      mockPage.fill
        .mockRejectedValueOnce(new Error('Not found'))
        .mockResolvedValueOnce(undefined);
      
      const action = { type: 'fill', selector: '#email1, #email2', value: 'test@example.com' };
      const result = await executor.execute(action, mockContext);

      expect(result.success).toBe(true);
      expect(result.data.selector).toBe('#email2');
    });
  });

  describe('executeSelect', () => {
    it('should select option', async () => {
      const action = { type: 'select', selector: '#country', value: 'JP' };
      const result = await executor.execute(action, mockContext);

      expect(result.success).toBe(true);
      expect(result.type).toBe('select');
      expect(mockPage.selectOption).toHaveBeenCalledWith('#country', 'JP', { timeout: 5000 });
    });

    it('should try multiple selectors for select', async () => {
      mockPage.selectOption
        .mockRejectedValueOnce(new Error('Not found'))
        .mockResolvedValueOnce(undefined);
      
      const action = { type: 'select', selector: '#dropdown1, #dropdown2', value: 'option1' };
      const result = await executor.execute(action, mockContext);

      expect(result.success).toBe(true);
      expect(result.data.selector).toBe('#dropdown2');
    });
  });

  describe('executeWait', () => {
    it('should wait for specified duration', async () => {
      jest.useFakeTimers();
      
      const action = { type: 'wait', delay: 1000 };
      const promise = executor.execute(action, mockContext);
      
      jest.advanceTimersByTime(1000);
      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.type).toBe('wait');
      expect(result.data.delay).toBe(1000);

      jest.useRealTimers();
    });
  });

  describe('executeScreenshot', () => {
    it('should capture screenshot', async () => {
      const action = { type: 'screenshot', name: 'test-screenshot' };
      const result = await executor.execute(action, mockContext);

      expect(result.success).toBe(true);
      expect(result.type).toBe('screenshot');
      expect(result.data.path).toBe('/path/to/screenshot.png');
      expect(mockScreenshot.capture).toHaveBeenCalledWith(mockPage, {
        name: 'test-screenshot',
        fullPage: undefined,
      });
    });

    it('should capture full page screenshot', async () => {
      const action = { type: 'screenshot', name: 'full-page', fullPage: true };
      const result = await executor.execute(action, mockContext);

      expect(result.success).toBe(true);
      expect(result.data.fullPage).toBe(true);
    });
  });

  describe('executeAssert', () => {
    it('should assert element is visible', async () => {
      const action = { type: 'assert', selector: '#message' };
      const result = await executor.execute(action, mockContext);

      expect(result.success).toBe(true);
      expect(result.type).toBe('assert');
      expect(result.data.visible).toBe(true);
    });

    it('should verify expected text', async () => {
      const mockLocator = {
        waitFor: jest.fn().mockResolvedValue(undefined),
        textContent: jest.fn().mockResolvedValue('Hello World'),
      };
      mockPage.locator.mockReturnValue(mockLocator);

      const action = { type: 'assert', selector: '#message', expectedText: 'Hello' };
      const result = await executor.execute(action, mockContext);

      expect(result.success).toBe(true);
      expect(result.data.text).toBe('Hello World');
    });

    it('should fail if expected text not found', async () => {
      const mockLocator = {
        waitFor: jest.fn().mockResolvedValue(undefined),
        textContent: jest.fn().mockResolvedValue('Goodbye World'),
      };
      mockPage.locator.mockReturnValue(mockLocator);

      const action = { type: 'assert', selector: '#message', expectedText: 'Hello' };
      const result = await executor.execute(action, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Expected "Hello"');
    });
  });

  describe('default timeout', () => {
    it('should use default timeout if not provided', async () => {
      const contextWithoutTimeout = { page: mockPage, screenshot: mockScreenshot };
      
      const action = { type: 'navigate', url: 'https://example.com' };
      await executor.execute(action, contextWithoutTimeout);

      expect(mockPage.goto).toHaveBeenCalledWith('https://example.com', {
        timeout: 30000, // default
        waitUntil: 'domcontentloaded',
      });
    });
  });
});
