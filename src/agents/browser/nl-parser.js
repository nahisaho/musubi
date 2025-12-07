/**
 * @fileoverview Natural Language Parser for Browser Commands
 * @module agents/browser/nl-parser
 */

/**
 * @typedef {Object} Action
 * @property {string} type - Action type
 * @property {string} [url] - URL for navigate actions
 * @property {string} [selector] - CSS selector for element actions
 * @property {string} [value] - Value for fill/select actions
 * @property {number} [delay] - Delay in milliseconds for wait actions
 * @property {string} [name] - Name for screenshot actions
 * @property {boolean} [fullPage] - Full page screenshot flag
 */

/**
 * @typedef {Object} ParseResult
 * @property {boolean} success - Whether parsing succeeded
 * @property {Action[]} actions - Parsed actions
 * @property {string} [error] - Error message if failed
 */

/**
 * Action patterns for Japanese and English
 */
const ACTION_PATTERNS = {
  navigate: {
    patterns: [
      /(?:に)?移動|開く|アクセス/,
      /(?:go to|navigate|open|visit)/i,
    ],
    urlPattern: /(https?:\/\/[^\s]+)/,
  },
  click: {
    patterns: [
      /クリック|押す|タップ|選択/,
      /click|press|tap|select/i,
    ],
  },
  fill: {
    patterns: [
      /(?:に|を)?入力|記入|タイプ/,
      /fill|type|enter|input/i,
    ],
    valuePattern: /[「「]([^」」]+)[」」]|"([^"]+)"|'([^']+)'/,
  },
  select: {
    patterns: [
      /ドロップダウン.*選択|選択.*オプション/,
      /select.*dropdown|choose.*option/i,
    ],
  },
  wait: {
    patterns: [
      /秒?待つ|待機/,
      /wait|pause|delay/i,
    ],
    durationPattern: /(\d+)\s*秒|(\d+)\s*(?:seconds?|ms|milliseconds?)/i,
  },
  screenshot: {
    patterns: [
      /スクリーンショット|画面.*(?:保存|撮|キャプチャ)/,
      /screenshot|capture|save.*screen/i,
    ],
    namePattern: /[「「]([^」」]+)[」」]|"([^"]+)"|として\s*(\S+)/,
  },
  assert: {
    patterns: [
      /(?:が)?表示|確認|検証|存在/,
      /(?:is )?visible|assert|verify|check|exists?/i,
    ],
    textPattern: /[「「]([^」」]+)[」」]|"([^"]+)"/,
  },
};

/**
 * Common element selector patterns
 */
const ELEMENT_PATTERNS = {
  // Japanese element names
  'ログインボタン': 'button:has-text("ログイン"), [data-testid="login-button"], button[type="submit"]',
  '送信ボタン': 'button:has-text("送信"), [data-testid="submit-button"], button[type="submit"]',
  'メール': 'input[type="email"], input[name="email"], [data-testid="email-input"]',
  'パスワード': 'input[type="password"], [data-testid="password-input"]',
  '検索': 'input[type="search"], [data-testid="search-input"], input[name="q"]',
  // English element names
  'login button': 'button:has-text("Login"), [data-testid="login-button"], button[type="submit"]',
  'submit button': 'button:has-text("Submit"), [data-testid="submit-button"], button[type="submit"]',
  'email': 'input[type="email"], input[name="email"], [data-testid="email-input"]',
  'password': 'input[type="password"], [data-testid="password-input"]',
  'search': 'input[type="search"], [data-testid="search-input"], input[name="q"]',
};

/**
 * Natural Language Parser for browser commands
 */
class NLParser {
  constructor() {
    this.actionPatterns = ACTION_PATTERNS;
    this.elementPatterns = ELEMENT_PATTERNS;
  }

  /**
   * Parse a natural language command into actions
   * @param {string} command - Natural language command
   * @returns {ParseResult}
   */
  parse(command) {
    try {
      const normalizedCommand = this.normalizeCommand(command);
      const actions = this.extractActions(normalizedCommand);

      if (actions.length === 0) {
        return {
          success: false,
          actions: [],
          error: `Could not understand command: "${command}"`,
        };
      }

      return {
        success: true,
        actions,
      };
    } catch (error) {
      return {
        success: false,
        actions: [],
        error: error.message,
      };
    }
  }

  /**
   * Normalize a command for parsing
   * @param {string} command
   * @returns {string}
   */
  normalizeCommand(command) {
    return command
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/、/g, ',')
      .replace(/。/g, '.');
  }

  /**
   * Extract actions from a normalized command
   * @param {string} command
   * @returns {Action[]}
   */
  extractActions(command) {
    const actions = [];
    const parts = this.splitCommand(command);

    for (const part of parts) {
      const action = this.parseAction(part);
      if (action) {
        actions.push(action);
      }
    }

    return actions;
  }

  /**
   * Split command into individual action parts
   * @param {string} command
   * @returns {string[]}
   */
  splitCommand(command) {
    // Split by conjunctions and separators
    const separators = /[,、]|\s+(?:そして|して|and|then)\s+/i;
    return command.split(separators).map(s => s.trim()).filter(Boolean);
  }

  /**
   * Parse a single action from text
   * @param {string} text
   * @returns {Action|null}
   */
  parseAction(text) {
    // Try each action type
    if (this.matchesPattern(text, this.actionPatterns.navigate.patterns)) {
      return this.parseNavigate(text);
    }

    if (this.matchesPattern(text, this.actionPatterns.screenshot.patterns)) {
      return this.parseScreenshot(text);
    }

    if (this.matchesPattern(text, this.actionPatterns.wait.patterns)) {
      return this.parseWait(text);
    }

    if (this.matchesPattern(text, this.actionPatterns.fill.patterns)) {
      return this.parseFill(text);
    }

    if (this.matchesPattern(text, this.actionPatterns.select.patterns)) {
      return this.parseSelect(text);
    }

    if (this.matchesPattern(text, this.actionPatterns.click.patterns)) {
      return this.parseClick(text);
    }

    if (this.matchesPattern(text, this.actionPatterns.assert.patterns)) {
      return this.parseAssert(text);
    }

    return null;
  }

  /**
   * Check if text matches any of the patterns
   * @param {string} text
   * @param {RegExp[]} patterns
   * @returns {boolean}
   */
  matchesPattern(text, patterns) {
    return patterns.some(pattern => pattern.test(text));
  }

  /**
   * Parse navigate action
   * @param {string} text
   * @returns {Action}
   */
  parseNavigate(text) {
    const urlMatch = text.match(this.actionPatterns.navigate.urlPattern);
    const url = urlMatch ? urlMatch[1] : null;

    return {
      type: 'navigate',
      url: url || 'about:blank',
      raw: text,
    };
  }

  /**
   * Parse click action
   * @param {string} text
   * @returns {Action}
   */
  parseClick(text) {
    const selector = this.extractSelector(text);

    return {
      type: 'click',
      selector,
      raw: text,
    };
  }

  /**
   * Parse fill action
   * @param {string} text
   * @returns {Action}
   */
  parseFill(text) {
    const selector = this.extractSelector(text);
    const valueMatch = text.match(this.actionPatterns.fill.valuePattern);
    const value = valueMatch ? (valueMatch[1] || valueMatch[2] || valueMatch[3]) : '';

    return {
      type: 'fill',
      selector,
      value,
      raw: text,
    };
  }

  /**
   * Parse select action
   * @param {string} text
   * @returns {Action}
   */
  parseSelect(text) {
    const selector = this.extractSelector(text);
    const valueMatch = text.match(this.actionPatterns.fill.valuePattern);
    const value = valueMatch ? (valueMatch[1] || valueMatch[2] || valueMatch[3]) : '';

    return {
      type: 'select',
      selector,
      value,
      raw: text,
    };
  }

  /**
   * Parse wait action
   * @param {string} text
   * @returns {Action}
   */
  parseWait(text) {
    const durationMatch = text.match(this.actionPatterns.wait.durationPattern);
    let delay = 1000; // Default 1 second

    if (durationMatch) {
      const seconds = durationMatch[1] || durationMatch[2];
      delay = parseInt(seconds, 10) * 1000;
      
      // Check if it's milliseconds
      if (/ms|milliseconds?/i.test(text)) {
        delay = parseInt(seconds, 10);
      }
    }

    return {
      type: 'wait',
      delay,
      raw: text,
    };
  }

  /**
   * Parse screenshot action
   * @param {string} text
   * @returns {Action}
   */
  parseScreenshot(text) {
    const nameMatch = text.match(this.actionPatterns.screenshot.namePattern);
    const name = nameMatch ? (nameMatch[1] || nameMatch[2] || nameMatch[3]) : undefined;
    const fullPage = /全体|full\s*page/i.test(text);

    return {
      type: 'screenshot',
      name,
      fullPage,
      raw: text,
    };
  }

  /**
   * Parse assert action
   * @param {string} text
   * @returns {Action}
   */
  parseAssert(text) {
    const textMatch = text.match(this.actionPatterns.assert.textPattern);
    const expectedText = textMatch ? (textMatch[1] || textMatch[2]) : null;
    const selector = expectedText ? `text="${expectedText}"` : this.extractSelector(text);

    return {
      type: 'assert',
      selector,
      expectedText,
      raw: text,
    };
  }

  /**
   * Extract a CSS selector from text
   * @param {string} text
   * @returns {string}
   */
  extractSelector(text) {
    // Check for known element patterns
    for (const [name, selector] of Object.entries(this.elementPatterns)) {
      if (text.toLowerCase().includes(name.toLowerCase())) {
        return selector;
      }
    }

    // Check for CSS selector in the text (match only the selector part)
    const selectorMatch = text.match(/([#\.][a-zA-Z][\w\-]*|\[[^\]]+\])/);
    if (selectorMatch) {
      return selectorMatch[0];
    }

    // Check for data-testid
    const testIdMatch = text.match(/data-testid[=:]["']?([^"'\s]+)/i);
    if (testIdMatch) {
      return `[data-testid="${testIdMatch[1]}"]`;
    }

    // Try to extract element description
    const elementMatch = text.match(/(?:の)?(?:ボタン|リンク|入力欄?|フィールド|テキスト|button|link|input|field|text)\s*[「「]?([^」」\s]*)[」」]?/i);
    if (elementMatch && elementMatch[1]) {
      return `text="${elementMatch[1]}"`;
    }

    // Default to a generic selector
    return '*';
  }

  /**
   * Add a custom element pattern
   * @param {string} name - Element name
   * @param {string} selector - CSS selector
   */
  addElementPattern(name, selector) {
    this.elementPatterns[name] = selector;
  }

  /**
   * Get all supported action types
   * @returns {string[]}
   */
  getSupportedActions() {
    return Object.keys(this.actionPatterns);
  }
}

module.exports = NLParser;
