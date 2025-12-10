/**
 * @file code-reviewer.js
 * @description Autonomous code review engine for agentic coding
 * @version 1.0.0
 */

'use strict';

const { EventEmitter } = require('events');
const path = require('path');

/**
 * Review severity levels
 * @enum {string}
 */
const SEVERITY = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
};

/**
 * Issue category types
 * @enum {string}
 */
const CATEGORY = {
  STYLE: 'style',
  LOGIC: 'logic',
  SECURITY: 'security',
  PERFORMANCE: 'performance',
  MAINTAINABILITY: 'maintainability',
  BEST_PRACTICE: 'best-practice',
  ERROR_HANDLING: 'error-handling',
  DOCUMENTATION: 'documentation'
};

/**
 * @typedef {Object} ReviewIssue
 * @property {string} id - Issue identifier
 * @property {string} severity - Issue severity
 * @property {string} category - Issue category
 * @property {string} message - Issue message
 * @property {number} [line] - Line number
 * @property {number} [column] - Column number
 * @property {string} [code] - Problematic code snippet
 * @property {string} [suggestion] - Fix suggestion
 * @property {string} [rule] - Rule that was violated
 */

/**
 * @typedef {Object} ReviewResult
 * @property {string} id - Review identifier
 * @property {string} filePath - Reviewed file path
 * @property {string} language - Code language
 * @property {ReviewIssue[]} issues - Found issues
 * @property {number} score - Overall score (0-100)
 * @property {Object} summary - Review summary
 * @property {number} timestamp - Review timestamp
 */

/**
 * @typedef {Object} CodeReviewerOptions
 * @property {Object} [rules={}] - Custom review rules
 * @property {string[]} [enabledCategories] - Categories to check
 * @property {number} [minScore=70] - Minimum acceptable score
 * @property {boolean} [strictMode=false] - Enable strict checking
 */

/**
 * Default review rules
 */
const DEFAULT_RULES = {
  javascript: [
    {
      id: 'js-no-var',
      pattern: /\bvar\s+/g,
      category: CATEGORY.BEST_PRACTICE,
      severity: SEVERITY.WARNING,
      message: 'Use const or let instead of var',
      suggestion: 'Replace var with const or let'
    },
    {
      id: 'js-console-log',
      pattern: /console\.(log|debug|info)\(/g,
      category: CATEGORY.BEST_PRACTICE,
      severity: SEVERITY.INFO,
      message: 'Console statements should be removed in production',
      suggestion: 'Remove or replace with proper logging'
    },
    {
      id: 'js-eval',
      pattern: /\beval\s*\(/g,
      category: CATEGORY.SECURITY,
      severity: SEVERITY.CRITICAL,
      message: 'eval() is dangerous and should be avoided',
      suggestion: 'Use safer alternatives to eval()'
    },
    {
      id: 'js-todo',
      pattern: /\/\/\s*TODO:/gi,
      category: CATEGORY.MAINTAINABILITY,
      severity: SEVERITY.INFO,
      message: 'TODO comment found',
      suggestion: 'Complete or track the TODO item'
    },
    {
      id: 'js-empty-catch',
      pattern: /catch\s*\([^)]*\)\s*\{\s*\}/g,
      category: CATEGORY.ERROR_HANDLING,
      severity: SEVERITY.ERROR,
      message: 'Empty catch block swallows errors',
      suggestion: 'Handle or log the caught error'
    },
    {
      id: 'js-magic-number',
      pattern: /(?<![\w.])(?<!\.)\b\d{2,}\b(?![\w.])/g,
      category: CATEGORY.MAINTAINABILITY,
      severity: SEVERITY.INFO,
      message: 'Magic number should be extracted to a named constant',
      suggestion: 'Define a constant with a descriptive name'
    },
    {
      id: 'js-long-function',
      pattern: /function\s+\w+\s*\([^)]*\)\s*\{/g,
      category: CATEGORY.MAINTAINABILITY,
      severity: SEVERITY.WARNING,
      message: 'Function may be too long',
      checkLength: true,
      maxLength: 50
    },
    {
      id: 'js-no-strict',
      checkGlobal: true,
      pattern: null,
      category: CATEGORY.BEST_PRACTICE,
      severity: SEVERITY.WARNING,
      message: 'Consider adding "use strict"',
      condition: (code) => !code.includes("'use strict'") && !code.includes('"use strict"')
    }
  ],
  
  python: [
    {
      id: 'py-except-bare',
      pattern: /except\s*:/g,
      category: CATEGORY.ERROR_HANDLING,
      severity: SEVERITY.WARNING,
      message: 'Bare except catches all exceptions',
      suggestion: 'Specify the exception type to catch'
    },
    {
      id: 'py-print',
      pattern: /\bprint\s*\(/g,
      category: CATEGORY.BEST_PRACTICE,
      severity: SEVERITY.INFO,
      message: 'Print statements should use logging in production',
      suggestion: 'Use logging module instead'
    },
    {
      id: 'py-todo',
      pattern: /#\s*TODO:/gi,
      category: CATEGORY.MAINTAINABILITY,
      severity: SEVERITY.INFO,
      message: 'TODO comment found',
      suggestion: 'Complete or track the TODO item'
    },
    {
      id: 'py-global',
      pattern: /\bglobal\s+\w+/g,
      category: CATEGORY.BEST_PRACTICE,
      severity: SEVERITY.WARNING,
      message: 'Global variables should be avoided',
      suggestion: 'Consider using class or function parameters'
    }
  ],
  
  common: [
    {
      id: 'common-fixme',
      pattern: /FIXME/gi,
      category: CATEGORY.MAINTAINABILITY,
      severity: SEVERITY.WARNING,
      message: 'FIXME comment found - needs attention',
      suggestion: 'Address the FIXME issue'
    },
    {
      id: 'common-hack',
      pattern: /HACK/gi,
      category: CATEGORY.MAINTAINABILITY,
      severity: SEVERITY.WARNING,
      message: 'HACK comment found - technical debt',
      suggestion: 'Refactor the hack'
    },
    {
      id: 'common-password',
      pattern: /password\s*=\s*['"][^'"]+['"]/gi,
      category: CATEGORY.SECURITY,
      severity: SEVERITY.CRITICAL,
      message: 'Hardcoded password detected',
      suggestion: 'Use environment variables or secure vault'
    },
    {
      id: 'common-api-key',
      pattern: /api[_-]?key\s*=\s*['"][^'"]+['"]/gi,
      category: CATEGORY.SECURITY,
      severity: SEVERITY.CRITICAL,
      message: 'Hardcoded API key detected',
      suggestion: 'Use environment variables'
    }
  ]
};

/**
 * Code Reviewer class for autonomous code review
 * @extends EventEmitter
 */
class CodeReviewer extends EventEmitter {
  /**
   * Create code reviewer
   * @param {CodeReviewerOptions} [options={}] - Reviewer options
   */
  constructor(options = {}) {
    super();
    
    this.rules = this.mergeRules(DEFAULT_RULES, options.rules || {});
    this.enabledCategories = options.enabledCategories || Object.values(CATEGORY);
    this.minScore = options.minScore ?? 70;
    this.strictMode = options.strictMode ?? false;
    
    // State
    this.reviews = new Map();
    this.reviewCounter = 0;
  }
  
  /**
   * Merge custom rules with defaults
   * @private
   */
  mergeRules(defaults, custom) {
    const merged = { ...defaults };
    
    for (const [lang, rules] of Object.entries(custom)) {
      if (merged[lang]) {
        merged[lang] = [...merged[lang], ...rules];
      } else {
        merged[lang] = rules;
      }
    }
    
    return merged;
  }
  
  /**
   * Review code
   * @param {string} code - Code to review
   * @param {Object} [options={}] - Review options
   * @returns {ReviewResult}
   */
  review(code, options = {}) {
    const id = this.generateId();
    const language = options.language || this.detectLanguage(code, options.filePath);
    const filePath = options.filePath || 'unknown';
    
    this.emit('review:start', { id, filePath, language });
    
    const issues = [];
    
    // Get applicable rules
    const rules = [
      ...(this.rules[language] || []),
      ...(this.rules.common || [])
    ];
    
    // Apply each rule
    for (const rule of rules) {
      // Check if category is enabled
      if (!this.enabledCategories.includes(rule.category)) continue;
      
      // Apply rule
      const ruleIssues = this.applyRule(rule, code, language);
      issues.push(...ruleIssues);
    }
    
    // Run additional checks
    const structuralIssues = this.checkStructure(code, language);
    issues.push(...structuralIssues);
    
    // Calculate score
    const score = this.calculateScore(issues);
    
    // Create result
    const result = {
      id,
      filePath,
      language,
      issues,
      score,
      summary: this.createSummary(issues, score),
      timestamp: Date.now()
    };
    
    // Store review
    this.reviews.set(id, result);
    
    this.emit('review:complete', { result });
    
    return result;
  }
  
  /**
   * Apply a single rule
   * @private
   */
  applyRule(rule, code, _language) {
    const issues = [];
    
    // Handle condition-based rules
    if (rule.condition) {
      if (rule.condition(code)) {
        issues.push(this.createIssue(rule, null, null));
      }
      return issues;
    }
    
    // Handle pattern-based rules
    if (!rule.pattern) return issues;
    
    const _lines = code.split('\n');
    let match;
    
    // Reset regex
    rule.pattern.lastIndex = 0;
    
    while ((match = rule.pattern.exec(code)) !== null) {
      const line = this.getLineNumber(code, match.index);
      const column = match.index - this.getLineStart(code, line);
      
      // Skip if checking length and within limit
      if (rule.checkLength) {
        const funcEnd = this.findFunctionEnd(code, match.index);
        const funcLines = code.substring(match.index, funcEnd).split('\n').length;
        if (funcLines <= rule.maxLength) continue;
      }
      
      issues.push(this.createIssue(rule, line, column, match[0]));
    }
    
    return issues;
  }
  
  /**
   * Create an issue object
   * @private
   */
  createIssue(rule, line, column, code = null) {
    return {
      id: `issue-${++this.reviewCounter}`,
      severity: rule.severity,
      category: rule.category,
      message: rule.message,
      line,
      column,
      code,
      suggestion: rule.suggestion,
      rule: rule.id
    };
  }
  
  /**
   * Check code structure
   * @private
   */
  checkStructure(code, language) {
    const issues = [];
    const lines = code.split('\n');
    
    // Check line length
    lines.forEach((line, index) => {
      if (line.length > 120) {
        issues.push({
          id: `issue-${++this.reviewCounter}`,
          severity: SEVERITY.INFO,
          category: CATEGORY.STYLE,
          message: `Line exceeds 120 characters (${line.length})`,
          line: index + 1,
          suggestion: 'Break long lines for better readability'
        });
      }
    });
    
    // Check for missing documentation
    if (language === 'javascript' || language === 'typescript') {
      if (!code.includes('/**') && !code.includes('//')) {
        issues.push({
          id: `issue-${++this.reviewCounter}`,
          severity: SEVERITY.INFO,
          category: CATEGORY.DOCUMENTATION,
          message: 'Code lacks documentation comments',
          suggestion: 'Add JSDoc comments to functions and classes'
        });
      }
    }
    
    // Check nesting depth
    const maxNesting = this.checkNestingDepth(code);
    if (maxNesting > 4) {
      issues.push({
        id: `issue-${++this.reviewCounter}`,
        severity: SEVERITY.WARNING,
        category: CATEGORY.MAINTAINABILITY,
        message: `Deep nesting detected (depth: ${maxNesting})`,
        suggestion: 'Consider extracting nested code into separate functions'
      });
    }
    
    return issues;
  }
  
  /**
   * Check nesting depth
   * @private
   */
  checkNestingDepth(code) {
    let maxDepth = 0;
    let currentDepth = 0;
    
    for (const char of code) {
      if (char === '{') {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      } else if (char === '}') {
        currentDepth = Math.max(0, currentDepth - 1);
      }
    }
    
    return maxDepth;
  }
  
  /**
   * Calculate review score
   * @private
   */
  calculateScore(issues) {
    let score = 100;
    
    const penalties = {
      [SEVERITY.INFO]: 1,
      [SEVERITY.WARNING]: 3,
      [SEVERITY.ERROR]: 10,
      [SEVERITY.CRITICAL]: 25
    };
    
    for (const issue of issues) {
      score -= penalties[issue.severity] || 0;
    }
    
    return Math.max(0, score);
  }
  
  /**
   * Create review summary
   * @private
   */
  createSummary(issues, score) {
    const bySeverity = {};
    const byCategory = {};
    
    for (const issue of issues) {
      bySeverity[issue.severity] = (bySeverity[issue.severity] || 0) + 1;
      byCategory[issue.category] = (byCategory[issue.category] || 0) + 1;
    }
    
    return {
      totalIssues: issues.length,
      bySeverity,
      byCategory,
      score,
      passed: score >= this.minScore,
      recommendation: this.getRecommendation(score, issues)
    };
  }
  
  /**
   * Get recommendation based on score
   * @private
   */
  getRecommendation(score, _issues) {
    if (score >= 90) return 'Excellent! Code quality is high.';
    if (score >= 80) return 'Good. Minor improvements recommended.';
    if (score >= 70) return 'Acceptable. Several issues should be addressed.';
    if (score >= 50) return 'Needs work. Significant improvements required.';
    return 'Critical issues detected. Immediate attention required.';
  }
  
  /**
   * Get line number from position
   * @private
   */
  getLineNumber(code, position) {
    return code.substring(0, position).split('\n').length;
  }
  
  /**
   * Get line start position
   * @private
   */
  getLineStart(code, lineNumber) {
    const lines = code.split('\n');
    let start = 0;
    for (let i = 0; i < lineNumber - 1 && i < lines.length; i++) {
      start += lines[i].length + 1;
    }
    return start;
  }
  
  /**
   * Find function end position
   * @private
   */
  findFunctionEnd(code, start) {
    let depth = 0;
    let inFunction = false;
    
    for (let i = start; i < code.length; i++) {
      if (code[i] === '{') {
        depth++;
        inFunction = true;
      } else if (code[i] === '}') {
        depth--;
        if (inFunction && depth === 0) {
          return i + 1;
        }
      }
    }
    
    return code.length;
  }
  
  /**
   * Detect language
   * @private
   */
  detectLanguage(code, filePath) {
    if (filePath) {
      const ext = path.extname(filePath);
      const langMap = {
        '.js': 'javascript',
        '.ts': 'typescript',
        '.py': 'python',
        '.jsx': 'javascript',
        '.tsx': 'typescript'
      };
      return langMap[ext] || 'javascript';
    }
    
    // Detect from content
    if (code.includes('def ') || code.includes('import ') && !code.includes('from \'')) {
      return 'python';
    }
    
    return 'javascript';
  }
  
  /**
   * Generate unique ID
   * @private
   */
  generateId() {
    return `review-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 6)}`;
  }
  
  /**
   * Get review by ID
   * @param {string} reviewId - Review identifier
   * @returns {ReviewResult|null}
   */
  getReview(reviewId) {
    return this.reviews.get(reviewId) || null;
  }
  
  /**
   * Get all reviews
   * @returns {ReviewResult[]}
   */
  getAllReviews() {
    return Array.from(this.reviews.values());
  }
  
  /**
   * Get statistics
   * @returns {Object}
   */
  getStats() {
    const reviews = this.getAllReviews();
    const scores = reviews.map(r => r.score);
    
    return {
      totalReviews: reviews.length,
      averageScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
      passed: reviews.filter(r => r.summary.passed).length,
      failed: reviews.filter(r => !r.summary.passed).length,
      totalIssues: reviews.reduce((sum, r) => sum + r.issues.length, 0)
    };
  }
  
  /**
   * Add custom rule
   * @param {string} language - Language
   * @param {Object} rule - Rule definition
   */
  addRule(language, rule) {
    if (!this.rules[language]) {
      this.rules[language] = [];
    }
    this.rules[language].push(rule);
  }
  
  /**
   * Clear reviews
   */
  clearReviews() {
    this.reviews.clear();
  }
  
  /**
   * Export review to markdown
   * @param {string} reviewId - Review identifier
   * @returns {string}
   */
  exportToMarkdown(reviewId) {
    const review = this.getReview(reviewId);
    if (!review) return '';
    
    let md = `# Code Review Report\n\n`;
    md += `**File:** ${review.filePath}\n`;
    md += `**Language:** ${review.language}\n`;
    md += `**Score:** ${review.score}/100 ${review.summary.passed ? '✅' : '❌'}\n\n`;
    
    md += `## Summary\n\n`;
    md += `${review.summary.recommendation}\n\n`;
    md += `- Total Issues: ${review.issues.length}\n`;
    for (const [severity, count] of Object.entries(review.summary.bySeverity)) {
      md += `- ${severity}: ${count}\n`;
    }
    
    if (review.issues.length > 0) {
      md += `\n## Issues\n\n`;
      
      for (const issue of review.issues) {
        const icon = {
          [SEVERITY.INFO]: 'ℹ️',
          [SEVERITY.WARNING]: '⚠️',
          [SEVERITY.ERROR]: '❌',
          [SEVERITY.CRITICAL]: '🚨'
        }[issue.severity];
        
        md += `### ${icon} ${issue.message}\n\n`;
        md += `- **Severity:** ${issue.severity}\n`;
        md += `- **Category:** ${issue.category}\n`;
        if (issue.line) md += `- **Line:** ${issue.line}\n`;
        if (issue.suggestion) md += `- **Suggestion:** ${issue.suggestion}\n`;
        md += `\n`;
      }
    }
    
    return md;
  }
}

/**
 * Create code reviewer
 * @param {CodeReviewerOptions} [options={}] - Reviewer options
 * @returns {CodeReviewer}
 */
function createCodeReviewer(options = {}) {
  return new CodeReviewer(options);
}

/**
 * Review code
 * @param {string} code - Code to review
 * @param {Object} [options={}] - Review options
 * @returns {ReviewResult}
 */
function reviewCode(code, options = {}) {
  const reviewer = createCodeReviewer(options);
  return reviewer.review(code, options);
}

module.exports = {
  CodeReviewer,
  createCodeReviewer,
  reviewCode,
  SEVERITY,
  CATEGORY,
  DEFAULT_RULES
};
