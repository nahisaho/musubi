/**
 * @fileoverview Action Executor for Browser Automation
 * @module agents/browser/action-executor
 */

/**
 * @typedef {Object} ActionResult
 * @property {boolean} success - Whether the action succeeded
 * @property {string} type - Action type
 * @property {string} [error] - Error message if failed
 * @property {*} [data] - Result data
 */

/**
 * @typedef {Object} ExecutionContext
 * @property {import('playwright').Page} page - Playwright page instance
 * @property {import('./screenshot')} screenshot - Screenshot capture instance
 * @property {number} timeout - Default timeout
 */

/**
 * Action Executor - Executes parsed actions using Playwright
 */
class ActionExecutor {
  constructor() {
    this.defaultTimeout = 30000;
  }

  /**
   * Execute a single action
   * @param {import('./nl-parser').Action} action - Action to execute
   * @param {ExecutionContext} context - Execution context
   * @returns {Promise<ActionResult>}
   */
  async execute(action, context) {
    const { page, timeout = this.defaultTimeout } = context;

    try {
      switch (action.type) {
        case 'navigate':
          return await this.executeNavigate(action, page, timeout);
        case 'click':
          return await this.executeClick(action, page, timeout);
        case 'fill':
          return await this.executeFill(action, page, timeout);
        case 'select':
          return await this.executeSelect(action, page, timeout);
        case 'wait':
          return await this.executeWait(action);
        case 'screenshot':
          return await this.executeScreenshot(action, context);
        case 'assert':
          return await this.executeAssert(action, page, timeout);
        default:
          return {
            success: false,
            type: action.type,
            error: `Unknown action type: ${action.type}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        type: action.type,
        error: error.message,
      };
    }
  }

  /**
   * Execute navigate action
   * @param {Object} action
   * @param {import('playwright').Page} page
   * @param {number} timeout
   * @returns {Promise<ActionResult>}
   */
  async executeNavigate(action, page, timeout) {
    await page.goto(action.url, { timeout, waitUntil: 'domcontentloaded' });
    
    return {
      success: true,
      type: 'navigate',
      data: { url: action.url, currentUrl: page.url() },
    };
  }

  /**
   * Execute click action
   * @param {Object} action
   * @param {import('playwright').Page} page
   * @param {number} timeout
   * @returns {Promise<ActionResult>}
   */
  async executeClick(action, page, timeout) {
    const selectors = action.selector.split(',').map(s => s.trim());
    
    // Try each selector until one works
    for (const selector of selectors) {
      try {
        await page.click(selector, { timeout });
        return {
          success: true,
          type: 'click',
          data: { selector },
        };
      } catch (e) {
        // Try next selector
      }
    }

    // If none worked, try with the original selector and let it fail
    await page.click(action.selector, { timeout });
    
    return {
      success: true,
      type: 'click',
      data: { selector: action.selector },
    };
  }

  /**
   * Execute fill action
   * @param {Object} action
   * @param {import('playwright').Page} page
   * @param {number} timeout
   * @returns {Promise<ActionResult>}
   */
  async executeFill(action, page, timeout) {
    const selectors = action.selector.split(',').map(s => s.trim());
    
    // Try each selector until one works
    for (const selector of selectors) {
      try {
        await page.fill(selector, action.value, { timeout });
        return {
          success: true,
          type: 'fill',
          data: { selector, value: action.value },
        };
      } catch (e) {
        // Try next selector
      }
    }

    // If none worked, try with the original selector
    await page.fill(action.selector, action.value, { timeout });
    
    return {
      success: true,
      type: 'fill',
      data: { selector: action.selector, value: action.value },
    };
  }

  /**
   * Execute select action
   * @param {Object} action
   * @param {import('playwright').Page} page
   * @param {number} timeout
   * @returns {Promise<ActionResult>}
   */
  async executeSelect(action, page, timeout) {
    const selectors = action.selector.split(',').map(s => s.trim());
    
    for (const selector of selectors) {
      try {
        await page.selectOption(selector, action.value, { timeout });
        return {
          success: true,
          type: 'select',
          data: { selector, value: action.value },
        };
      } catch (e) {
        // Try next selector
      }
    }

    await page.selectOption(action.selector, action.value, { timeout });
    
    return {
      success: true,
      type: 'select',
      data: { selector: action.selector, value: action.value },
    };
  }

  /**
   * Execute wait action
   * @param {Object} action
   * @returns {Promise<ActionResult>}
   */
  async executeWait(action) {
    await new Promise(resolve => setTimeout(resolve, action.delay));
    
    return {
      success: true,
      type: 'wait',
      data: { delay: action.delay },
    };
  }

  /**
   * Execute screenshot action
   * @param {Object} action
   * @param {ExecutionContext} context
   * @returns {Promise<ActionResult>}
   */
  async executeScreenshot(action, context) {
    const { page, screenshot } = context;
    
    const path = await screenshot.capture(page, {
      name: action.name,
      fullPage: action.fullPage,
    });
    
    return {
      success: true,
      type: 'screenshot',
      data: { path, fullPage: action.fullPage },
    };
  }

  /**
   * Execute assert action
   * @param {Object} action
   * @param {import('playwright').Page} page
   * @param {number} timeout
   * @returns {Promise<ActionResult>}
   */
  async executeAssert(action, page, timeout) {
    const locator = page.locator(action.selector);
    
    await locator.waitFor({ state: 'visible', timeout });
    
    let text = null;
    if (action.expectedText) {
      text = await locator.textContent();
      if (!text.includes(action.expectedText)) {
        return {
          success: false,
          type: 'assert',
          error: `Expected "${action.expectedText}" but found "${text}"`,
        };
      }
    }
    
    return {
      success: true,
      type: 'assert',
      data: { selector: action.selector, visible: true, text },
    };
  }
}

module.exports = ActionExecutor;
