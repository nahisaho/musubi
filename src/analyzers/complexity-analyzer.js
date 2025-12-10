/**
 * MUSUBI Complexity Analyzer (Enhanced)
 *
 * Advanced complexity detection including:
 * - Giant function detection (100/500/1000+ lines)
 * - Cyclomatic complexity with severity levels
 * - Cognitive complexity calculation
 * - Dependency complexity
 * - Split recommendations
 *
 * Based on GCC analysis where 95 functions exceeded 1000 lines
 *
 * @version 5.5.0
 */

const fs = require('fs-extra');
const path = require('path');

// ============================================================================
// Thresholds
// ============================================================================

const THRESHOLDS = {
  functionLines: {
    ideal: 50,
    warning: 100,
    critical: 500,
    extreme: 1000,
  },
  cyclomaticComplexity: {
    ideal: 5,
    warning: 10,
    critical: 25,
    extreme: 50,
  },
  cognitiveComplexity: {
    ideal: 8,
    warning: 15,
    critical: 30,
    extreme: 60,
  },
  dependencies: {
    ideal: 5,
    warning: 10,
    critical: 30,
    extreme: 100,
  },
  fileLines: {
    ideal: 300,
    warning: 500,
    critical: 1000,
    extreme: 2000,
  },
};

// ============================================================================
// Complexity Analyzer
// ============================================================================

class ComplexityAnalyzer {
  constructor(options = {}) {
    this.options = {
      thresholds: { ...THRESHOLDS, ...options.thresholds },
      includeRecommendations: true,
      ...options,
    };
  }

  /**
   * Analyze a file for complexity issues
   */
  async analyzeFile(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n');
    const language = this.detectLanguage(filePath);

    const analysis = {
      path: filePath,
      language,
      totalLines: lines.length,
      codeLines: this.countCodeLines(lines),
      functions: [],
      issues: [],
      metrics: {
        cyclomaticComplexity: 0,
        cognitiveComplexity: 0,
        maintainabilityIndex: 0,
      },
    };

    // Extract and analyze functions
    analysis.functions = await this.extractFunctions(content, language, lines);

    // Calculate file-level metrics
    analysis.metrics.cyclomaticComplexity = this.calculateCyclomaticComplexity(content);
    analysis.metrics.cognitiveComplexity = this.calculateCognitiveComplexity(content, language);
    analysis.metrics.maintainabilityIndex = this.calculateMaintainabilityIndex(
      analysis.codeLines,
      analysis.metrics.cyclomaticComplexity
    );

    // Detect issues
    analysis.issues = this.detectIssues(analysis);

    return analysis;
  }

  /**
   * Detect language from file extension
   */
  detectLanguage(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const langMap = {
      '.js': 'javascript',
      '.ts': 'typescript',
      '.jsx': 'javascript',
      '.tsx': 'typescript',
      '.c': 'c',
      '.h': 'c',
      '.cpp': 'cpp',
      '.cc': 'cpp',
      '.hpp': 'cpp',
      '.py': 'python',
      '.rs': 'rust',
      '.go': 'go',
      '.java': 'java',
    };
    return langMap[ext] || 'unknown';
  }

  /**
   * Count non-empty, non-comment lines
   */
  countCodeLines(lines) {
    return lines.filter(line => {
      const trimmed = line.trim();
      return trimmed.length > 0 &&
        !trimmed.startsWith('//') &&
        !trimmed.startsWith('/*') &&
        !trimmed.startsWith('*') &&
        !trimmed.startsWith('#');
    }).length;
  }

  /**
   * Extract functions from code
   */
  async extractFunctions(content, language, lines) {
    const functions = [];
    const patterns = this.getFunctionPatterns(language);

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const name = match[1] || match[2] || 'anonymous';
        const startIndex = match.index;
        const startLine = content.substring(0, startIndex).split('\n').length;
        const endLine = this.findFunctionEnd(lines, startLine - 1, language);
        const functionLines = endLine - startLine + 1;

        const functionContent = lines.slice(startLine - 1, endLine).join('\n');

        functions.push({
          name,
          startLine,
          endLine,
          lines: functionLines,
          cyclomaticComplexity: this.calculateCyclomaticComplexity(functionContent),
          cognitiveComplexity: this.calculateCognitiveComplexity(functionContent, language),
          severity: this.getSeverity(functionLines, 'functionLines'),
          issues: [],
          recommendations: [],
        });
      }
    }

    // Add issues and recommendations to each function
    for (const func of functions) {
      func.issues = this.detectFunctionIssues(func);
      if (this.options.includeRecommendations && func.issues.length > 0) {
        func.recommendations = this.generateRecommendations(func);
      }
    }

    return functions;
  }

  /**
   * Get function detection patterns for language
   */
  getFunctionPatterns(language) {
    const patterns = {
      javascript: [
        /function\s+(\w+)\s*\(/g,
        /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?function/g,
        /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g,
        /(\w+)\s*:\s*(?:async\s+)?function/g,
      ],
      typescript: [
        /function\s+(\w+)\s*[<(]/g,
        /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?function/g,
        /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g,
        /(\w+)\s*\([^)]*\)\s*:\s*\w+\s*\{/g,
      ],
      c: [
        /(?:static\s+)?(?:inline\s+)?(?:\w+\s+)+(\w+)\s*\([^)]*\)\s*\{/g,
      ],
      cpp: [
        /(?:static\s+)?(?:inline\s+)?(?:virtual\s+)?(?:\w+\s+)+(\w+)\s*\([^)]*\)(?:\s*const)?\s*(?:override)?\s*\{/g,
        /(\w+)::(\w+)\s*\([^)]*\)\s*\{/g,
      ],
      python: [
        /def\s+(\w+)\s*\(/g,
        /async\s+def\s+(\w+)\s*\(/g,
      ],
      rust: [
        /(?:pub\s+)?(?:async\s+)?fn\s+(\w+)/g,
      ],
      go: [
        /func\s+(?:\([^)]+\)\s+)?(\w+)/g,
      ],
      java: [
        /(?:public|private|protected)?\s*(?:static)?\s*(?:\w+)\s+(\w+)\s*\([^)]*\)\s*(?:throws\s+[\w,\s]+)?\s*\{/g,
      ],
    };
    return patterns[language] || patterns.javascript;
  }

  /**
   * Find end of function
   */
  findFunctionEnd(lines, startLine, _language) {
    if (_language === 'python') {
      const startIndent = lines[startLine]?.match(/^\s*/)?.[0].length || 0;
      for (let i = startLine + 1; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim() && line.match(/^\s*/)[0].length <= startIndent) {
          return i;
        }
      }
      return lines.length;
    }

    let braceCount = 0;
    let started = false;

    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i];
      for (const char of line) {
        if (char === '{') {
          braceCount++;
          started = true;
        } else if (char === '}') {
          braceCount--;
          if (started && braceCount === 0) {
            return i + 1;
          }
        }
      }
    }

    return Math.min(startLine + 100, lines.length);
  }

  /**
   * Calculate cyclomatic complexity
   */
  calculateCyclomaticComplexity(code) {
    let complexity = 1;

    const patterns = [
      /\bif\b/g,
      /\belse\s+if\b/g,
      /\bfor\b/g,
      /\bwhile\b/g,
      /\bcase\b/g,
      /\bcatch\b/g,
      /&&/g,
      /\|\|/g,
      /\?[^:]*:/g,
    ];

    patterns.forEach(pattern => {
      const matches = code.match(pattern);
      if (matches) complexity += matches.length;
    });

    return complexity;
  }

  /**
   * Calculate cognitive complexity (SonarSource method)
   */
  calculateCognitiveComplexity(code, _language) {
    let complexity = 0;
    let nestingLevel = 0;

    const lines = code.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      // Nesting increases
      if (/\{$/.test(trimmed)) {
        nestingLevel++;
      }
      if (/^\}/.test(trimmed)) {
        nestingLevel = Math.max(0, nestingLevel - 1);
      }

      // Control flow structures add complexity + nesting penalty
      if (/\b(if|else\s+if|elif)\b/.test(trimmed)) {
        complexity += 1 + nestingLevel;
      }
      if (/\b(for|while|do)\b/.test(trimmed)) {
        complexity += 1 + nestingLevel;
      }
      if (/\b(catch|except)\b/.test(trimmed)) {
        complexity += 1 + nestingLevel;
      }

      // Switch/match statements
      if (/\b(switch|match)\b/.test(trimmed)) {
        complexity += 1;
      }

      // Logical operators
      const andOr = (trimmed.match(/&&|\|\|/g) || []).length;
      complexity += andOr;

      // Recursion (function calls to self)
      // This is simplified - would need function name context

      // Break/continue with labels
      if (/\b(break|continue)\s+\w+/.test(trimmed)) {
        complexity += 1;
      }

      // Nested ternary
      const ternaries = (trimmed.match(/\?[^:]*:/g) || []).length;
      if (ternaries > 1) {
        complexity += ternaries; // Nested ternaries are especially hard to read
      }
    }

    return complexity;
  }

  /**
   * Calculate maintainability index
   */
  calculateMaintainabilityIndex(codeLines, complexity) {
    // Simplified Maintainability Index formula
    // MI = 171 - 5.2 * ln(Halstead Volume) - 0.23 * (Cyclomatic Complexity) - 16.2 * ln(Lines of Code)
    // We use a simplified version

    const volumeScore = Math.max(0, 100 - Math.log2(codeLines + 1) * 10);
    const complexityScore = Math.max(0, 100 - complexity * 2);

    return Math.round(volumeScore * 0.5 + complexityScore * 0.5);
  }

  /**
   * Get severity level based on threshold
   */
  getSeverity(value, metricType) {
    const thresholds = this.options.thresholds[metricType];
    if (!thresholds) return 'unknown';

    if (value >= thresholds.extreme) return 'extreme';
    if (value >= thresholds.critical) return 'critical';
    if (value >= thresholds.warning) return 'warning';
    if (value > thresholds.ideal) return 'minor';
    return 'ok';
  }

  /**
   * Detect issues in function
   */
  detectFunctionIssues(func) {
    const issues = [];

    // Function size
    if (func.lines >= THRESHOLDS.functionLines.extreme) {
      issues.push({
        type: 'giant-function',
        severity: 'extreme',
        metric: 'lines',
        value: func.lines,
        threshold: THRESHOLDS.functionLines.extreme,
        message: `Function "${func.name}" has ${func.lines} lines (extreme: >${THRESHOLDS.functionLines.extreme})`,
      });
    } else if (func.lines >= THRESHOLDS.functionLines.critical) {
      issues.push({
        type: 'very-large-function',
        severity: 'critical',
        metric: 'lines',
        value: func.lines,
        threshold: THRESHOLDS.functionLines.critical,
        message: `Function "${func.name}" has ${func.lines} lines (critical: >${THRESHOLDS.functionLines.critical})`,
      });
    } else if (func.lines >= THRESHOLDS.functionLines.warning) {
      issues.push({
        type: 'large-function',
        severity: 'warning',
        metric: 'lines',
        value: func.lines,
        threshold: THRESHOLDS.functionLines.warning,
        message: `Function "${func.name}" has ${func.lines} lines (warning: >${THRESHOLDS.functionLines.warning})`,
      });
    }

    // Cyclomatic complexity
    if (func.cyclomaticComplexity >= THRESHOLDS.cyclomaticComplexity.extreme) {
      issues.push({
        type: 'extreme-complexity',
        severity: 'extreme',
        metric: 'cyclomatic',
        value: func.cyclomaticComplexity,
        threshold: THRESHOLDS.cyclomaticComplexity.extreme,
        message: `Function "${func.name}" has cyclomatic complexity ${func.cyclomaticComplexity} (extreme: >${THRESHOLDS.cyclomaticComplexity.extreme})`,
      });
    } else if (func.cyclomaticComplexity >= THRESHOLDS.cyclomaticComplexity.critical) {
      issues.push({
        type: 'high-complexity',
        severity: 'critical',
        metric: 'cyclomatic',
        value: func.cyclomaticComplexity,
        threshold: THRESHOLDS.cyclomaticComplexity.critical,
        message: `Function "${func.name}" has cyclomatic complexity ${func.cyclomaticComplexity} (critical: >${THRESHOLDS.cyclomaticComplexity.critical})`,
      });
    }

    // Cognitive complexity
    if (func.cognitiveComplexity >= THRESHOLDS.cognitiveComplexity.extreme) {
      issues.push({
        type: 'extreme-cognitive-complexity',
        severity: 'extreme',
        metric: 'cognitive',
        value: func.cognitiveComplexity,
        threshold: THRESHOLDS.cognitiveComplexity.extreme,
        message: `Function "${func.name}" has cognitive complexity ${func.cognitiveComplexity} (extreme: >${THRESHOLDS.cognitiveComplexity.extreme})`,
      });
    }

    return issues;
  }

  /**
   * Detect file-level issues
   */
  detectIssues(analysis) {
    const issues = [];

    // File size
    if (analysis.codeLines >= THRESHOLDS.fileLines.extreme) {
      issues.push({
        type: 'giant-file',
        severity: 'extreme',
        message: `File has ${analysis.codeLines} code lines (extreme: >${THRESHOLDS.fileLines.extreme})`,
      });
    }

    // Aggregate function issues
    const giantFunctions = analysis.functions.filter(f =>
      f.lines >= THRESHOLDS.functionLines.extreme
    );
    if (giantFunctions.length > 0) {
      issues.push({
        type: 'contains-giant-functions',
        severity: 'extreme',
        message: `File contains ${giantFunctions.length} giant functions (>${THRESHOLDS.functionLines.extreme} lines)`,
        functions: giantFunctions.map(f => f.name),
      });
    }

    return issues;
  }

  /**
   * Generate recommendations for a complex function
   */
  generateRecommendations(func) {
    const recommendations = [];

    // Size-based recommendations
    if (func.lines >= THRESHOLDS.functionLines.warning) {
      const targetCount = Math.ceil(func.lines / 50);
      recommendations.push({
        type: 'split-function',
        priority: func.lines >= THRESHOLDS.functionLines.extreme ? 'P0' : 'P1',
        title: 'Split into smaller functions',
        description: `Break "${func.name}" into approximately ${targetCount} smaller functions (~50 lines each)`,
        actions: [
          'Identify distinct logical sections within the function',
          'Extract each section into a helper function',
          'Use descriptive names that explain what each helper does',
          'Consider using the "Extract Method" refactoring pattern',
        ],
      });
    }

    // Complexity-based recommendations
    if (func.cyclomaticComplexity >= THRESHOLDS.cyclomaticComplexity.warning) {
      recommendations.push({
        type: 'reduce-complexity',
        priority: func.cyclomaticComplexity >= THRESHOLDS.cyclomaticComplexity.extreme ? 'P0' : 'P1',
        title: 'Reduce cyclomatic complexity',
        description: `Current complexity: ${func.cyclomaticComplexity}, target: <${THRESHOLDS.cyclomaticComplexity.warning}`,
        actions: [
          'Replace nested conditionals with early returns',
          'Use polymorphism instead of type-checking switches',
          'Extract complex conditions into well-named boolean functions',
          'Consider using the Strategy pattern for complex branching',
        ],
      });
    }

    // Cognitive complexity recommendations
    if (func.cognitiveComplexity >= THRESHOLDS.cognitiveComplexity.warning) {
      recommendations.push({
        type: 'improve-readability',
        priority: 'P2',
        title: 'Improve cognitive readability',
        description: `Cognitive complexity: ${func.cognitiveComplexity}`,
        actions: [
          'Reduce nesting depth by inverting conditions',
          'Avoid nested ternary operators',
          'Break long chains of && and || into named variables',
          'Consider using guard clauses instead of nested if-else',
        ],
      });
    }

    return recommendations;
  }
}

module.exports = {
  ComplexityAnalyzer,
  THRESHOLDS,
};
