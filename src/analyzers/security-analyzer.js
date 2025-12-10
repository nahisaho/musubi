/**
 * Security Analyzer
 *
 * Inspired by OpenHands security module
 * Detects security risks in agent actions and code
 *
 * REQ-P0-B007: Security Risk Detection
 */

'use strict';

/**
 * Risk levels with severity ordering
 */
const RiskLevel = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
};

/**
 * Severity order for comparison
 */
const RISK_SEVERITY = {
  [RiskLevel.LOW]: 1,
  [RiskLevel.MEDIUM]: 2,
  [RiskLevel.HIGH]: 3,
  [RiskLevel.CRITICAL]: 4,
};

/**
 * Security detection patterns
 */
const SECURITY_PATTERNS = {
  secrets: [
    {
      pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*["']?[\w-]{20,}/gi,
      name: 'API Key',
      level: RiskLevel.HIGH,
    },
    {
      pattern: /(?:password|passwd|pwd)\s*[:=]\s*["']?[^\s"']{8,}/gi,
      name: 'Password',
      level: RiskLevel.HIGH,
    },
    {
      pattern: /(?:secret|token)\s*[:=]\s*["']?[\w-]{20,}/gi,
      name: 'Secret/Token',
      level: RiskLevel.HIGH,
    },
    {
      pattern: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/g,
      name: 'Private Key',
      level: RiskLevel.CRITICAL,
    },
    {
      pattern: /ghp_[a-zA-Z0-9]{36}/g,
      name: 'GitHub Personal Access Token',
      level: RiskLevel.CRITICAL,
    },
    {
      pattern: /gho_[a-zA-Z0-9]{36}/g,
      name: 'GitHub OAuth Token',
      level: RiskLevel.CRITICAL,
    },
    {
      pattern: /sk-[a-zA-Z0-9]{48}/g,
      name: 'OpenAI API Key',
      level: RiskLevel.CRITICAL,
    },
    {
      pattern: /AKIA[0-9A-Z]{16}/g,
      name: 'AWS Access Key ID',
      level: RiskLevel.CRITICAL,
    },
    {
      pattern: /xox[baprs]-[0-9a-zA-Z]{10,}/g,
      name: 'Slack Token',
      level: RiskLevel.HIGH,
    },
    {
      pattern: /SG\.[a-zA-Z0-9]{22}\.[a-zA-Z0-9]{43}/g,
      name: 'SendGrid API Key',
      level: RiskLevel.HIGH,
    },
  ],
  dangerousCommands: [
    {
      pattern: /rm\s+(-rf?|--recursive)\s+[/~]/g,
      name: 'Recursive Delete (root/home)',
      level: RiskLevel.CRITICAL,
    },
    {
      pattern: /rm\s+(-rf?|--recursive)\s+\*/g,
      name: 'Recursive Delete (wildcard)',
      level: RiskLevel.HIGH,
    },
    {
      pattern: /sudo\s+rm\s+/g,
      name: 'Sudo Remove',
      level: RiskLevel.HIGH,
    },
    {
      pattern: /sudo\s+chmod\s+/g,
      name: 'Sudo Chmod',
      level: RiskLevel.MEDIUM,
    },
    {
      pattern: /chmod\s+777\s+/g,
      name: 'Chmod 777',
      level: RiskLevel.HIGH,
    },
    {
      pattern: />\s*\/dev\/sd[a-z]/g,
      name: 'Write to Block Device',
      level: RiskLevel.CRITICAL,
    },
    {
      pattern: /mkfs\.\w+/g,
      name: 'Format Filesystem',
      level: RiskLevel.CRITICAL,
    },
    {
      pattern: /dd\s+if=.*\s+of=\/dev\//g,
      name: 'DD to Device',
      level: RiskLevel.CRITICAL,
    },
    {
      pattern: /:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;?\s*:/g,
      name: 'Fork Bomb',
      level: RiskLevel.CRITICAL,
    },
    {
      pattern: /curl\s+.*\|\s*(?:bash|sh)/g,
      name: 'Curl Pipe to Shell',
      level: RiskLevel.HIGH,
    },
    {
      pattern: /wget\s+.*\|\s*(?:bash|sh)/g,
      name: 'Wget Pipe to Shell',
      level: RiskLevel.HIGH,
    },
  ],
  vulnerabilities: [
    {
      pattern: /eval\s*\([^)]*\)/g,
      name: 'Eval Usage',
      level: RiskLevel.MEDIUM,
    },
    {
      pattern: /new\s+Function\s*\(/g,
      name: 'Dynamic Function Creation',
      level: RiskLevel.MEDIUM,
    },
    {
      pattern: /child_process\.(exec|spawn|execSync)/g,
      name: 'Shell Command Execution',
      level: RiskLevel.MEDIUM,
    },
    {
      pattern: /\.innerHTML\s*=/g,
      name: 'innerHTML Assignment',
      level: RiskLevel.MEDIUM,
    },
    {
      pattern: /document\.write\s*\(/g,
      name: 'Document Write',
      level: RiskLevel.MEDIUM,
    },
    {
      pattern: /\$\{[^}]*\}/g,
      name: 'Template Injection Risk',
      level: RiskLevel.LOW,
    },
    {
      pattern: /dangerouslySetInnerHTML/g,
      name: 'React Dangerous HTML',
      level: RiskLevel.MEDIUM,
    },
    {
      pattern: /sql\s*=\s*["'`].*\+/gi,
      name: 'SQL Injection Risk',
      level: RiskLevel.HIGH,
    },
    {
      pattern: /\bexec\s*\(/g,
      name: 'Exec Function',
      level: RiskLevel.MEDIUM,
    },
    {
      pattern: /process\.env\.[A-Z_]+/g,
      name: 'Environment Variable Access',
      level: RiskLevel.LOW,
    },
  ],
  network: [
    {
      pattern: /http:\/\/(?!localhost|127\.0\.0\.1)/g,
      name: 'Insecure HTTP URL',
      level: RiskLevel.LOW,
    },
    {
      pattern: /0\.0\.0\.0:\d+/g,
      name: 'Binding to All Interfaces',
      level: RiskLevel.MEDIUM,
    },
    {
      pattern: /tlsRejectUnauthorized\s*:\s*false/g,
      name: 'Disabled TLS Verification',
      level: RiskLevel.HIGH,
    },
    {
      pattern: /NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]?0/g,
      name: 'Disabled Node TLS',
      level: RiskLevel.HIGH,
    },
  ],
};

/**
 * Default configuration
 */
const DEFAULT_OPTIONS = {
  confirmationMode: true,
  riskThreshold: RiskLevel.MEDIUM,
  allowedCommands: [],
  blockedPatterns: [],
  ignorePaths: [],
};

/**
 * Represents a detected security risk
 */
class SecurityRisk {
  /**
   * @param {Object} params
   * @param {string} params.category - Risk category (secrets, dangerousCommands, vulnerabilities, network)
   * @param {string} params.name - Pattern name
   * @param {string} params.level - Risk level
   * @param {string} params.match - Matched content
   * @param {number} params.position - Position in content
   * @param {string} [params.file] - File where risk was found
   * @param {number} [params.line] - Line number
   */
  constructor({ category, name, level, match, position, file, line }) {
    this.category = category;
    this.name = name;
    this.level = level;
    this.match = match;
    this.position = position;
    this.file = file;
    this.line = line;
    this.timestamp = new Date();
  }

  /**
   * Get severity as number (1-4)
   */
  getSeverity() {
    return RISK_SEVERITY[this.level] || 0;
  }

  /**
   * Get masked match for logging
   */
  getMaskedMatch() {
    if (this.category === 'secrets') {
      const len = this.match.length;
      if (len <= 8) return '***';
      return this.match.substring(0, 4) + '...' + this.match.substring(len - 4);
    }
    return this.match;
  }

  toJSON() {
    return {
      category: this.category,
      name: this.name,
      level: this.level,
      match: this.getMaskedMatch(),
      position: this.position,
      file: this.file,
      line: this.line,
      timestamp: this.timestamp.toISOString(),
    };
  }
}

/**
 * Result of security analysis
 */
class SecurityAnalysisResult {
  /**
   * @param {SecurityRisk[]} risks
   */
  constructor(risks = []) {
    this.risks = risks;
    this.timestamp = new Date();
  }

  /**
   * Get highest risk level
   */
  getHighestLevel() {
    if (this.risks.length === 0) return null;
    const highest = this.risks.reduce((max, risk) => {
      return risk.getSeverity() > max.getSeverity() ? risk : max;
    }, this.risks[0]);
    return highest.level;
  }

  /**
   * Check if any risk exceeds threshold
   * @param {string} threshold - Risk level threshold
   */
  exceedsThreshold(threshold) {
    const thresholdSeverity = RISK_SEVERITY[threshold] || 2;
    return this.risks.some((risk) => risk.getSeverity() >= thresholdSeverity);
  }

  /**
   * Get risks by level
   * @param {string} level
   */
  getRisksByLevel(level) {
    return this.risks.filter((risk) => risk.level === level);
  }

  /**
   * Get risks by category
   * @param {string} category
   */
  getRisksByCategory(category) {
    return this.risks.filter((risk) => risk.category === category);
  }

  /**
   * Check if action should be blocked
   */
  shouldBlock() {
    return this.risks.some((risk) => risk.level === RiskLevel.CRITICAL);
  }

  /**
   * Check if confirmation is required
   * @param {string} threshold
   */
  requiresConfirmation(threshold) {
    return this.exceedsThreshold(threshold);
  }

  /**
   * Get summary statistics
   */
  getSummary() {
    return {
      total: this.risks.length,
      byLevel: {
        [RiskLevel.LOW]: this.getRisksByLevel(RiskLevel.LOW).length,
        [RiskLevel.MEDIUM]: this.getRisksByLevel(RiskLevel.MEDIUM).length,
        [RiskLevel.HIGH]: this.getRisksByLevel(RiskLevel.HIGH).length,
        [RiskLevel.CRITICAL]: this.getRisksByLevel(RiskLevel.CRITICAL).length,
      },
      byCategory: {
        secrets: this.getRisksByCategory('secrets').length,
        dangerousCommands: this.getRisksByCategory('dangerousCommands').length,
        vulnerabilities: this.getRisksByCategory('vulnerabilities').length,
        network: this.getRisksByCategory('network').length,
      },
      highestLevel: this.getHighestLevel(),
      shouldBlock: this.shouldBlock(),
    };
  }

  toJSON() {
    return {
      risks: this.risks.map((r) => r.toJSON()),
      summary: this.getSummary(),
      timestamp: this.timestamp.toISOString(),
    };
  }
}

/**
 * Security Analyzer
 * Detects security risks in agent actions and code
 */
class SecurityAnalyzer {
  /**
   * @param {Object} options
   * @param {boolean} [options.confirmationMode=true] - Require confirmation for risky actions
   * @param {string} [options.riskThreshold='MEDIUM'] - Threshold for requiring confirmation
   * @param {string[]} [options.allowedCommands=[]] - Commands to allow regardless of risk
   * @param {string[]} [options.blockedPatterns=[]] - Additional patterns to block
   * @param {string[]} [options.ignorePaths=[]] - Paths to ignore during analysis
   */
  constructor(options = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.customPatterns = [];

    // Add blocked patterns from options
    if (this.options.blockedPatterns.length > 0) {
      this.addCustomPatterns(this.options.blockedPatterns);
    }
  }

  /**
   * Add custom patterns to detect
   * @param {string[]} patterns - Patterns as regex strings
   * @param {string} [level='HIGH'] - Risk level for custom patterns
   */
  addCustomPatterns(patterns, level = RiskLevel.HIGH) {
    for (const patternStr of patterns) {
      try {
        this.customPatterns.push({
          pattern: new RegExp(patternStr, 'g'),
          name: `Custom: ${patternStr}`,
          level,
        });
      } catch (e) {
        console.warn(`Invalid regex pattern: ${patternStr}`);
      }
    }
  }

  /**
   * Analyze content for security risks
   * @param {string} content - Content to analyze
   * @param {Object} [context] - Additional context
   * @param {string} [context.file] - File path
   * @param {string} [context.type] - Content type (code, command, etc.)
   * @returns {SecurityAnalysisResult}
   */
  analyzeContent(content, context = {}) {
    const risks = [];

    // Skip ignored paths
    if (context.file && this.shouldIgnorePath(context.file)) {
      return new SecurityAnalysisResult(risks);
    }

    // Check all pattern categories
    for (const [category, patterns] of Object.entries(SECURITY_PATTERNS)) {
      for (const patternDef of patterns) {
        const matches = this.findMatches(content, patternDef.pattern);
        for (const match of matches) {
          // Skip allowed commands
          if (category === 'dangerousCommands' && this.isAllowedCommand(match.text)) {
            continue;
          }

          risks.push(
            new SecurityRisk({
              category,
              name: patternDef.name,
              level: patternDef.level,
              match: match.text,
              position: match.position,
              file: context.file,
              line: this.getLineNumber(content, match.position),
            })
          );
        }
      }
    }

    // Check custom patterns
    for (const patternDef of this.customPatterns) {
      const matches = this.findMatches(content, patternDef.pattern);
      for (const match of matches) {
        risks.push(
          new SecurityRisk({
            category: 'custom',
            name: patternDef.name,
            level: patternDef.level,
            match: match.text,
            position: match.position,
            file: context.file,
            line: this.getLineNumber(content, match.position),
          })
        );
      }
    }

    return new SecurityAnalysisResult(risks);
  }

  /**
   * Analyze an action for security risks
   * @param {Object} action - Action object
   * @param {string} action.type - Action type
   * @param {string} [action.content] - Action content
   * @param {string} [action.command] - Command to execute
   * @param {string} [action.code] - Code to write
   * @param {string} [action.file] - Target file
   * @returns {SecurityAnalysisResult}
   */
  analyzeAction(action) {
    const contentToAnalyze = action.content || action.command || action.code || '';
    return this.analyzeContent(contentToAnalyze, {
      file: action.file,
      type: action.type,
    });
  }

  /**
   * Analyze multiple files
   * @param {Array<{path: string, content: string}>} files
   * @returns {SecurityAnalysisResult}
   */
  analyzeFiles(files) {
    const allRisks = [];

    for (const file of files) {
      if (this.shouldIgnorePath(file.path)) continue;

      const result = this.analyzeContent(file.content, { file: file.path });
      allRisks.push(...result.risks);
    }

    return new SecurityAnalysisResult(allRisks);
  }

  /**
   * Check if command is in allowed list
   * @param {string} command
   */
  isAllowedCommand(command) {
    return this.options.allowedCommands.some((allowed) => command.includes(allowed));
  }

  /**
   * Check if path should be ignored
   * @param {string} filePath
   */
  shouldIgnorePath(filePath) {
    return this.options.ignorePaths.some((pattern) => {
      if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        return regex.test(filePath);
      }
      return filePath.includes(pattern);
    });
  }

  /**
   * Find all matches for a pattern
   * @param {string} content
   * @param {RegExp} pattern
   */
  findMatches(content, pattern) {
    const matches = [];
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;

    while ((match = regex.exec(content)) !== null) {
      matches.push({
        text: match[0],
        position: match.index,
      });

      // Prevent infinite loop for zero-width matches
      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
      }
    }

    return matches;
  }

  /**
   * Get line number from position
   * @param {string} content
   * @param {number} position
   */
  getLineNumber(content, position) {
    const lines = content.substring(0, position).split('\n');
    return lines.length;
  }

  /**
   * Validate action and return decision
   * @param {Object} action
   * @returns {{allowed: boolean, reason: string, result: SecurityAnalysisResult}}
   */
  validateAction(action) {
    const result = this.analyzeAction(action);

    if (result.shouldBlock()) {
      return {
        allowed: false,
        reason: `Critical security risk detected: ${result.risks.find((r) => r.level === RiskLevel.CRITICAL).name}`,
        result,
      };
    }

    if (this.options.confirmationMode && result.requiresConfirmation(this.options.riskThreshold)) {
      return {
        allowed: false,
        reason: `Security risks detected above threshold (${this.options.riskThreshold}). Confirmation required.`,
        result,
      };
    }

    return {
      allowed: true,
      reason: result.risks.length > 0 ? `${result.risks.length} low-level risks detected but within threshold` : 'No security risks detected',
      result,
    };
  }

  /**
   * Get security policy from project.yml
   * @param {Object} projectConfig - Parsed project.yml
   * @returns {Object} - Security configuration
   */
  static fromProjectConfig(projectConfig) {
    const securityConfig = projectConfig.security || {};
    return new SecurityAnalyzer({
      confirmationMode: securityConfig.confirmation_mode ?? true,
      riskThreshold: securityConfig.risk_threshold || RiskLevel.MEDIUM,
      allowedCommands: securityConfig.allowed_commands || [],
      blockedPatterns: securityConfig.blocked_patterns || [],
      ignorePaths: securityConfig.ignore_paths || [],
    });
  }

  /**
   * Generate security report
   * @param {SecurityAnalysisResult} result
   * @returns {string}
   */
  generateReport(result) {
    const lines = ['# Security Analysis Report', '', `Generated: ${result.timestamp.toISOString()}`, ''];

    const summary = result.getSummary();

    lines.push('## Summary', '');
    lines.push(`- Total Risks: ${summary.total}`);
    lines.push(`- Highest Level: ${summary.highestLevel || 'None'}`);
    lines.push(`- Action Required: ${summary.shouldBlock ? 'BLOCKED' : 'Review'}`);
    lines.push('');

    lines.push('### By Level', '');
    lines.push(`- CRITICAL: ${summary.byLevel[RiskLevel.CRITICAL]}`);
    lines.push(`- HIGH: ${summary.byLevel[RiskLevel.HIGH]}`);
    lines.push(`- MEDIUM: ${summary.byLevel[RiskLevel.MEDIUM]}`);
    lines.push(`- LOW: ${summary.byLevel[RiskLevel.LOW]}`);
    lines.push('');

    if (result.risks.length > 0) {
      lines.push('## Detailed Findings', '');

      for (const risk of result.risks) {
        lines.push(`### ${risk.level}: ${risk.name}`);
        lines.push(`- Category: ${risk.category}`);
        lines.push(`- Match: \`${risk.getMaskedMatch()}\``);
        if (risk.file) lines.push(`- File: ${risk.file}`);
        if (risk.line) lines.push(`- Line: ${risk.line}`);
        lines.push('');
      }
    }

    return lines.join('\n');
  }
}

module.exports = {
  SecurityAnalyzer,
  SecurityRisk,
  SecurityAnalysisResult,
  RiskLevel,
  SECURITY_PATTERNS,
  RISK_SEVERITY,
};
