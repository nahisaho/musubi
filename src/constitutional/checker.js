/**
 * Constitutional Checker
 *
 * Validates compliance with Constitutional Articles.
 *
 * Requirement: IMP-6.2-005-01
 * Design: Section 5.1
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Constitutional Articles
 */
const ARTICLES = {
  I: {
    id: 'I',
    name: 'Specification First',
    description: 'All changes must be traceable to specifications',
    keywords: ['REQ-', 'IMP-', 'FEAT-', 'specification', 'requirement'],
  },
  II: {
    id: 'II',
    name: 'Quality Gate',
    description: 'Code must pass quality gates before merge',
    keywords: ['test', 'coverage', 'lint', 'quality'],
  },
  III: {
    id: 'III',
    name: 'Test-First',
    description: 'Tests should be written before or alongside implementation',
    keywords: ['test', 'spec', 'describe', 'it('],
  },
  IV: {
    id: 'IV',
    name: 'Incremental Delivery',
    description: 'Features should be delivered incrementally',
    keywords: ['sprint', 'iteration', 'milestone'],
  },
  V: {
    id: 'V',
    name: 'Consistency',
    description: 'Code style and patterns must be consistent',
    keywords: ['eslint', 'prettier', 'style'],
  },
  VI: {
    id: 'VI',
    name: 'Change Tracking',
    description: 'All changes must be tracked and documented',
    keywords: ['changelog', 'commit', 'version'],
  },
  VII: {
    id: 'VII',
    name: 'Simplicity',
    description: 'Prefer simple solutions over complex ones',
    thresholds: {
      maxFileLines: 500,
      maxFunctionLines: 50,
      maxCyclomaticComplexity: 10,
      maxDependencies: 10,
    },
  },
  VIII: {
    id: 'VIII',
    name: 'Anti-Abstraction',
    description: 'Avoid premature abstraction',
    patterns: [/abstract\s+class/i, /implements\s+\w+Factory/i, /extends\s+Base\w+/i],
  },
  IX: {
    id: 'IX',
    name: 'Documentation',
    description: 'Code must be documented',
    keywords: ['jsdoc', '@param', '@returns', '@description'],
  },
};

/**
 * Violation severity levels
 */
const SEVERITY = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

/**
 * ConstitutionalChecker
 *
 * Validates code against Constitutional Articles.
 */
class ConstitutionalChecker {
  /**
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    this.config = {
      articleVII: ARTICLES.VII.thresholds,
      ...config,
    };
  }

  /**
   * Check file for constitutional violations
   * @param {string} filePath - File path to check
   * @returns {Promise<Object>} Check result
   */
  async checkFile(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const violations = [];

    // Article I: Specification First
    const specViolation = this.checkArticleI(content, filePath);
    if (specViolation) violations.push(specViolation);

    // Article III: Test-First (for non-test files)
    if (!filePath.includes('.test.') && !filePath.includes('.spec.')) {
      const testViolation = await this.checkArticleIII(filePath);
      if (testViolation) violations.push(testViolation);
    }

    // Article VII: Simplicity
    const simplicityViolations = this.checkArticleVII(content, filePath);
    violations.push(...simplicityViolations);

    // Article VIII: Anti-Abstraction
    const abstractionViolations = this.checkArticleVIII(content, filePath);
    violations.push(...abstractionViolations);

    // Article IX: Documentation
    const docViolation = this.checkArticleIX(content, filePath);
    if (docViolation) violations.push(docViolation);

    return {
      filePath,
      violations,
      passed: violations.length === 0,
      checkedAt: new Date().toISOString(),
    };
  }

  /**
   * Check Article I: Specification First
   * @param {string} content - File content
   * @param {string} filePath - File path
   * @returns {Object|null} Violation or null
   */
  checkArticleI(content, filePath) {
    // Check if file has requirement reference
    const hasReqRef = ARTICLES.I.keywords.some(kw => content.includes(kw));

    // Skip check for certain file types
    const skipPatterns = [/\.test\./, /\.spec\./, /\.config\./, /index\./, /package\.json/];

    if (skipPatterns.some(p => p.test(filePath))) {
      return null;
    }

    if (!hasReqRef) {
      return {
        article: 'I',
        articleName: ARTICLES.I.name,
        severity: SEVERITY.MEDIUM,
        message: 'ファイルに要件参照（REQ-XXX、IMP-XXX等）がありません',
        filePath,
        suggestion: 'コードコメントまたはJSDocに関連する要件IDを追加してください',
      };
    }

    return null;
  }

  /**
   * Check Article III: Test-First
   * @param {string} filePath - Source file path
   * @returns {Promise<Object|null>} Violation or null
   */
  async checkArticleIII(filePath) {
    // Derive test file path
    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const base = path.basename(filePath, ext);

    const testPaths = [
      path.join(dir, `${base}.test${ext}`),
      path.join(dir, `${base}.spec${ext}`),
      path.join(dir, '__tests__', `${base}.test${ext}`),
      filePath.replace('/src/', '/tests/').replace(ext, `.test${ext}`),
    ];

    for (const testPath of testPaths) {
      try {
        await fs.access(testPath);
        return null; // Test file exists
      } catch {
        // Continue checking
      }
    }

    return {
      article: 'III',
      articleName: ARTICLES.III.name,
      severity: SEVERITY.HIGH,
      message: '対応するテストファイルがありません',
      filePath,
      suggestion: `テストファイル（例: ${base}.test${ext}）を作成してください`,
    };
  }

  /**
   * Check Article VII: Simplicity
   * @param {string} content - File content
   * @param {string} filePath - File path
   * @returns {Array} Violations
   */
  checkArticleVII(content, filePath) {
    const violations = [];
    const lines = content.split('\n');
    const thresholds = this.config.articleVII;

    // Check file length
    if (lines.length > thresholds.maxFileLines) {
      violations.push({
        article: 'VII',
        articleName: ARTICLES.VII.name,
        severity: SEVERITY.HIGH,
        message: `ファイルが長すぎます（${lines.length}行 > ${thresholds.maxFileLines}行）`,
        filePath,
        suggestion: 'ファイルを複数のモジュールに分割してください',
      });
    }

    // Check function length (simple heuristic)
    const functionMatches = content.match(
      /(?:function\s+\w+|(?:async\s+)?(?:\w+\s*=\s*)?(?:async\s+)?(?:function|\([^)]*\)\s*=>|\w+\s*\([^)]*\)\s*{))/g
    );
    if (functionMatches && functionMatches.length > 0) {
      // Count functions with many lines (rough estimate)
      const longFunctions = this.findLongFunctions(content, thresholds.maxFunctionLines);
      for (const fn of longFunctions) {
        violations.push({
          article: 'VII',
          articleName: ARTICLES.VII.name,
          severity: SEVERITY.MEDIUM,
          message: `関数 "${fn.name}" が長すぎます（約${fn.lines}行 > ${thresholds.maxFunctionLines}行）`,
          filePath,
          line: fn.startLine,
          suggestion: '関数をより小さな関数に分割してください',
        });
      }
    }

    // Check dependencies (require/import count)
    const imports = content.match(/(?:require\s*\(|import\s+)/g) || [];
    if (imports.length > thresholds.maxDependencies) {
      violations.push({
        article: 'VII',
        articleName: ARTICLES.VII.name,
        severity: SEVERITY.MEDIUM,
        message: `依存関係が多すぎます（${imports.length}個 > ${thresholds.maxDependencies}個）`,
        filePath,
        suggestion: '依存関係を見直し、必要に応じてモジュールを再構成してください',
      });
    }

    return violations;
  }

  /**
   * Find functions that exceed line limit
   * @param {string} content - File content
   * @param {number} maxLines - Maximum lines
   * @returns {Array} Long functions
   */
  findLongFunctions(content, maxLines) {
    const longFunctions = [];
    const lines = content.split('\n');

    // Simple bracket matching for function detection
    const functionPattern =
      /(?:async\s+)?(?:function\s+(\w+)|(\w+)\s*(?:=|:)\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>))/g;
    let match;

    while ((match = functionPattern.exec(content)) !== null) {
      const fnName = match[1] || match[2] || 'anonymous';
      const startIndex = match.index;
      const startLine = content.substring(0, startIndex).split('\n').length;

      // Find function end (simple brace counting)
      let braceCount = 0;
      let started = false;
      let endLine = startLine;

      for (let i = startLine - 1; i < lines.length; i++) {
        const line = lines[i];
        for (const char of line) {
          if (char === '{') {
            braceCount++;
            started = true;
          } else if (char === '}') {
            braceCount--;
          }
        }
        if (started && braceCount === 0) {
          endLine = i + 1;
          break;
        }
      }

      const lineCount = endLine - startLine + 1;
      if (lineCount > maxLines) {
        longFunctions.push({
          name: fnName,
          startLine,
          lines: lineCount,
        });
      }
    }

    return longFunctions;
  }

  /**
   * Check Article VIII: Anti-Abstraction
   * @param {string} content - File content
   * @param {string} filePath - File path
   * @returns {Array} Violations
   */
  checkArticleVIII(content, filePath) {
    const violations = [];

    for (const pattern of ARTICLES.VIII.patterns) {
      const match = content.match(pattern);
      if (match) {
        violations.push({
          article: 'VIII',
          articleName: ARTICLES.VIII.name,
          severity: SEVERITY.HIGH,
          message: `早すぎる抽象化の可能性: "${match[0]}"`,
          filePath,
          suggestion: '具体的な実装から始め、必要に応じて後から抽象化してください',
        });
      }
    }

    return violations;
  }

  /**
   * Check Article IX: Documentation
   * @param {string} content - File content
   * @param {string} filePath - File path
   * @returns {Object|null} Violation or null
   */
  checkArticleIX(content, filePath) {
    // Check for JSDoc presence
    const hasJSDoc = content.includes('/**') && content.includes('*/');
    const hasDescription = ARTICLES.IX.keywords.some(kw => content.includes(kw));

    // Skip test files
    if (filePath.includes('.test.') || filePath.includes('.spec.')) {
      return null;
    }

    if (!hasJSDoc || !hasDescription) {
      return {
        article: 'IX',
        articleName: ARTICLES.IX.name,
        severity: SEVERITY.LOW,
        message: 'ドキュメンテーションが不足しています',
        filePath,
        suggestion: 'JSDocコメントを追加してください',
      };
    }

    return null;
  }

  /**
   * Check multiple files
   * @param {Array} filePaths - File paths to check
   * @returns {Promise<Object>} Check results
   */
  async checkFiles(filePaths) {
    const results = [];
    let totalViolations = 0;
    const violationsByArticle = {};

    for (const filePath of filePaths) {
      try {
        const result = await this.checkFile(filePath);
        results.push(result);
        totalViolations += result.violations.length;

        for (const v of result.violations) {
          if (!violationsByArticle[v.article]) {
            violationsByArticle[v.article] = 0;
          }
          violationsByArticle[v.article]++;
        }
      } catch (error) {
        results.push({
          filePath,
          error: error.message,
          violations: [],
          passed: false,
        });
      }
    }

    return {
      results,
      summary: {
        filesChecked: filePaths.length,
        filesPassed: results.filter(r => r.passed).length,
        filesFailed: results.filter(r => !r.passed).length,
        totalViolations,
        violationsByArticle,
      },
      checkedAt: new Date().toISOString(),
    };
  }

  /**
   * Check directory recursively
   * @param {string} directory - Directory to check
   * @param {Object} options - Options
   * @returns {Promise<Object>} Check results
   */
  async checkDirectory(directory, options = {}) {
    const extensions = options.extensions || ['.js', '.ts'];
    const exclude = options.exclude || ['node_modules', '.git', 'dist', 'coverage'];

    const files = await this.findFiles(directory, extensions, exclude);
    return await this.checkFiles(files);
  }

  /**
   * Find files recursively
   * @param {string} dir - Directory
   * @param {Array} extensions - File extensions
   * @param {Array} exclude - Exclude patterns
   * @returns {Promise<Array>} File paths
   */
  async findFiles(dir, extensions, exclude) {
    const files = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (exclude.some(e => entry.name.includes(e))) {
          continue;
        }

        if (entry.isDirectory()) {
          const subFiles = await this.findFiles(fullPath, extensions, exclude);
          files.push(...subFiles);
        } else if (extensions.some(ext => entry.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    } catch {
      // Ignore errors
    }

    return files;
  }

  /**
   * Check if merge should be blocked
   * @param {Object} results - Check results
   * @returns {Object} Block decision
   */
  shouldBlockMerge(results) {
    const criticalViolations = results.results
      .flatMap(r => r.violations)
      .filter(v => v.severity === SEVERITY.CRITICAL);

    const highViolations = results.results
      .flatMap(r => r.violations)
      .filter(v => v.severity === SEVERITY.HIGH);

    // Block on Article VII or VIII high violations
    const phaseMinusOneViolations = results.results
      .flatMap(r => r.violations)
      .filter(
        v =>
          (v.article === 'VII' || v.article === 'VIII') &&
          (v.severity === SEVERITY.HIGH || v.severity === SEVERITY.CRITICAL)
      );

    return {
      shouldBlock: criticalViolations.length > 0 || phaseMinusOneViolations.length > 0,
      reason:
        criticalViolations.length > 0
          ? 'クリティカルな違反があります'
          : phaseMinusOneViolations.length > 0
            ? 'Article VII/VIII違反によりPhase -1 Gateレビューが必要です'
            : null,
      criticalCount: criticalViolations.length,
      highCount: highViolations.length,
      requiresPhaseMinusOne: phaseMinusOneViolations.length > 0,
    };
  }

  /**
   * Generate compliance report
   * @param {Object} results - Check results
   * @returns {string} Markdown report
   */
  generateReport(results) {
    const lines = [];
    const blockDecision = this.shouldBlockMerge(results);

    lines.push('# Constitutional Compliance Report');
    lines.push('');
    lines.push(`**Generated:** ${results.checkedAt}`);
    lines.push('');

    // Summary
    lines.push('## Summary');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Files Checked | ${results.summary.filesChecked} |`);
    lines.push(`| Files Passed | ${results.summary.filesPassed} |`);
    lines.push(`| Files Failed | ${results.summary.filesFailed} |`);
    lines.push(`| Total Violations | ${results.summary.totalViolations} |`);
    lines.push('');

    // Block decision
    if (blockDecision.shouldBlock) {
      lines.push('## ⛔ Merge Blocked');
      lines.push('');
      lines.push(`**Reason:** ${blockDecision.reason}`);
      if (blockDecision.requiresPhaseMinusOne) {
        lines.push('');
        lines.push('> Phase -1 Gate レビューが必要です。System Architectの承認を得てください。');
      }
      lines.push('');
    } else {
      lines.push('## ✅ Merge Allowed');
      lines.push('');
    }

    // Violations by Article
    lines.push('## Violations by Article');
    lines.push('');
    for (const [article, count] of Object.entries(results.summary.violationsByArticle)) {
      const articleInfo = ARTICLES[article];
      lines.push(
        `- **Article ${article}** (${articleInfo?.name || 'Unknown'}): ${count} violations`
      );
    }
    lines.push('');

    // Detailed violations
    if (results.summary.totalViolations > 0) {
      lines.push('## Detailed Violations');
      lines.push('');

      for (const result of results.results) {
        if (result.violations.length > 0) {
          lines.push(`### ${result.filePath}`);
          lines.push('');
          for (const v of result.violations) {
            const emoji =
              v.severity === SEVERITY.CRITICAL
                ? '🔴'
                : v.severity === SEVERITY.HIGH
                  ? '🟠'
                  : v.severity === SEVERITY.MEDIUM
                    ? '🟡'
                    : '🟢';
            lines.push(`${emoji} **Article ${v.article}** (${v.severity}): ${v.message}`);
            if (v.line) {
              lines.push(`  - Line: ${v.line}`);
            }
            lines.push(`  - Suggestion: ${v.suggestion}`);
            lines.push('');
          }
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * Save check results
   * @param {string} featureId - Feature ID
   * @param {Object} results - Check results
   */
  async saveResults(featureId, results) {
    await this.ensureStorageDir();
    const filePath = path.join(this.config.storageDir, `${featureId}.json`);
    await fs.writeFile(filePath, JSON.stringify(results, null, 2), 'utf-8');
  }

  /**
   * Load check results
   * @param {string} featureId - Feature ID
   * @returns {Promise<Object|null>} Results or null
   */
  async loadResults(featureId) {
    try {
      const filePath = path.join(this.config.storageDir, `${featureId}.json`);
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Ensure storage directory exists
   */
  async ensureStorageDir() {
    try {
      await fs.access(this.config.storageDir);
    } catch {
      await fs.mkdir(this.config.storageDir, { recursive: true });
    }
  }
}

module.exports = {
  ConstitutionalChecker,
  ARTICLES,
  SEVERITY,
};
