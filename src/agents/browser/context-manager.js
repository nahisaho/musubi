/**
 * @fileoverview Context Manager for Browser Automation
 * @module agents/browser/context-manager
 */

/**
 * Context Manager - Manages browser contexts, pages, and action history
 */
class ContextManager {
  constructor() {
    this.browser = null;
    this.contexts = new Map();
    this.pages = new Map();
    this.activeContextName = 'default';
    this.actionHistory = [];
  }

  /**
   * Initialize the context manager with a browser instance
   * @param {import('playwright').Browser} browser
   */
  async initialize(browser) {
    this.browser = browser;
    await this.createContext('default');
  }

  /**
   * Create a new browser context
   * @param {string} name - Context name
   * @param {Object} options - Context options
   * @returns {Promise<import('playwright').BrowserContext>}
   */
  async createContext(name, options = {}) {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const context = await this.browser.newContext({
      viewport: options.viewport || { width: 1280, height: 720 },
      userAgent: options.userAgent,
      locale: options.locale || 'ja-JP',
      timezoneId: options.timezoneId || 'Asia/Tokyo',
      ...options,
    });

    this.contexts.set(name, context);
    return context;
  }

  /**
   * Get an existing context or create a new one
   * @param {string} name - Context name
   * @returns {Promise<import('playwright').BrowserContext>}
   */
  async getOrCreateContext(name = 'default') {
    if (this.contexts.has(name)) {
      return this.contexts.get(name);
    }
    return this.createContext(name);
  }

  /**
   * Get an existing page or create a new one
   * @param {string} contextName - Context name
   * @returns {Promise<import('playwright').Page>}
   */
  async getOrCreatePage(contextName = 'default') {
    const pageKey = `${contextName}:main`;
    
    if (this.pages.has(pageKey)) {
      return this.pages.get(pageKey);
    }

    const context = await this.getOrCreateContext(contextName);
    const page = await context.newPage();
    
    this.pages.set(pageKey, page);
    return page;
  }

  /**
   * Create a new page in a context
   * @param {string} contextName - Context name
   * @param {string} pageName - Page name
   * @returns {Promise<import('playwright').Page>}
   */
  async createPage(contextName = 'default', pageName) {
    const context = await this.getOrCreateContext(contextName);
    const page = await context.newPage();
    
    const pageKey = `${contextName}:${pageName}`;
    this.pages.set(pageKey, page);
    
    return page;
  }

  /**
   * Get a specific page
   * @param {string} contextName - Context name
   * @param {string} pageName - Page name
   * @returns {import('playwright').Page|undefined}
   */
  getPage(contextName = 'default', pageName = 'main') {
    const pageKey = `${contextName}:${pageName}`;
    return this.pages.get(pageKey);
  }

  /**
   * Switch active context
   * @param {string} name - Context name
   */
  setActiveContext(name) {
    if (!this.contexts.has(name)) {
      throw new Error(`Context "${name}" does not exist`);
    }
    this.activeContextName = name;
  }

  /**
   * Get the active context name
   * @returns {string}
   */
  getActiveContextName() {
    return this.activeContextName;
  }

  /**
   * Record an action to history
   * @param {Object} action - Action object
   * @param {Object} result - Action result
   */
  recordAction(action, result) {
    this.actionHistory.push({
      action,
      result,
      timestamp: Date.now(),
      context: this.activeContextName,
    });
  }

  /**
   * Get action history
   * @returns {Array}
   */
  getActionHistory() {
    return [...this.actionHistory];
  }

  /**
   * Clear action history
   */
  clearHistory() {
    this.actionHistory = [];
  }

  /**
   * Close a specific context
   * @param {string} name - Context name
   */
  async closeContext(name) {
    const context = this.contexts.get(name);
    if (context) {
      await context.close();
      this.contexts.delete(name);
      
      // Remove associated pages
      for (const [key, page] of this.pages.entries()) {
        if (key.startsWith(`${name}:`)) {
          this.pages.delete(key);
        }
      }
    }
  }

  /**
   * Reset the context manager
   */
  reset() {
    this.contexts.clear();
    this.pages.clear();
    this.activeContextName = 'default';
    this.actionHistory = [];
    this.browser = null;
  }

  /**
   * Get all context names
   * @returns {string[]}
   */
  getContextNames() {
    return [...this.contexts.keys()];
  }

  /**
   * Get all page names for a context
   * @param {string} contextName
   * @returns {string[]}
   */
  getPageNames(contextName = 'default') {
    const prefix = `${contextName}:`;
    return [...this.pages.keys()]
      .filter(key => key.startsWith(prefix))
      .map(key => key.slice(prefix.length));
  }
}

module.exports = ContextManager;
