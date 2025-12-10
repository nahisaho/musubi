/**
 * MUSUBI Large Project Analyzer
 *
 * Streaming analysis for large-scale projects (10,000+ files)
 * Designed based on analysis of GCC codebase (1,000万+ lines)
 *
 * Features:
 * - Chunk-based file processing
 * - Memory-efficient streaming
 * - Progress tracking
 * - Parallel processing with worker threads
 *
 * @version 5.5.0
 */

const fs = require('fs-extra');
const path = require('path');
const { glob } = require('glob');
// Worker threads reserved for future parallel processing
// const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const os = require('os');

// ============================================================================
// Configuration
// ============================================================================

const THRESHOLDS = {
  // File count thresholds
  smallProject: 100,
  mediumProject: 1000,
  largeProject: 10000,
  massiveProject: 100000,

  // Function size thresholds (lines)
  functionLines: {
    warning: 100,
    critical: 500,
    extreme: 1000,
  },

  // Cyclomatic complexity thresholds
  cyclomaticComplexity: {
    warning: 10,
    critical: 25,
    extreme: 50,
  },

  // Dependency count thresholds
  dependencies: {
    warning: 10,
    critical: 30,
    extreme: 100,
  },
};

const CHUNK_SIZE = {
  small: 100,
  medium: 500,
  large: 1000,
  streaming: 2000,
};

// ============================================================================
// Large Project Analyzer
// ============================================================================

class LargeProjectAnalyzer {
  constructor(workspaceRoot, options = {}) {
    this.workspaceRoot = workspaceRoot;
    this.options = {
      chunkSize: CHUNK_SIZE.large,
      parallel: true,
      workerCount: Math.max(1, os.cpus().length - 1),
      progressCallback: null,
      memoryLimit: 2 * 1024 * 1024 * 1024, // 2GB default
      excludePatterns: [
        'node_modules/**',
        'dist/**',
        'build/**',
        '.git/**',
        'coverage/**',
        '*.min.js',
        '*.bundle.js',
        'vendor/**',
        'third_party/**',
      ],
      ...options,
    };

    this.stats = {
      totalFiles: 0,
      processedFiles: 0,
      skippedFiles: 0,
      errorFiles: 0,
      startTime: null,
      endTime: null,
      peakMemory: 0,
      chunks: 0,
    };

    this.results = {
      files: [],
      giantFunctions: [],
      hotspots: [],
      summary: null,
    };
  }

  /**
   * Analyze project with automatic scaling based on size
   */
  async analyze() {
    this.stats.startTime = Date.now();

    // Discover all files
    const files = await this.discoverFiles();
    this.stats.totalFiles = files.length;

    // Determine project scale and strategy
    const scale = this.determineScale(files.length);
    console.log(`📊 Project scale: ${scale.name} (${files.length.toLocaleString()} files)`);

    // Choose analysis strategy
    let results;
    switch (scale.strategy) {
      case 'batch':
        results = await this.batchAnalyze(files);
        break;
      case 'chunked':
        results = await this.chunkedAnalyze(files);
        break;
      case 'streaming':
        results = await this.streamingAnalyze(files);
        break;
      default:
        results = await this.batchAnalyze(files);
    }

    this.stats.endTime = Date.now();
    this.generateSummary(results);

    return {
      stats: this.stats,
      results: this.results,
      recommendations: this.generateRecommendations(),
    };
  }

  /**
   * Discover all analyzable files
   */
  async discoverFiles() {
    const patterns = [
      '**/*.js',
      '**/*.ts',
      '**/*.jsx',
      '**/*.tsx',
      '**/*.c',
      '**/*.cpp',
      '**/*.cc',
      '**/*.h',
      '**/*.hpp',
      '**/*.py',
      '**/*.rs',
      '**/*.go',
      '**/*.java',
    ];

    let allFiles = [];

    for (const pattern of patterns) {
      try {
        const files = await glob(pattern, {
          cwd: this.workspaceRoot,
          ignore: this.options.excludePatterns,
          nodir: true,
          absolute: true,
        });
        allFiles = allFiles.concat(files);
      } catch (error) {
        console.warn(`Pattern ${pattern} failed: ${error.message}`);
      }
    }

    return allFiles;
  }

  /**
   * Determine project scale and analysis strategy
   */
  determineScale(fileCount) {
    if (fileCount <= THRESHOLDS.smallProject) {
      return {
        name: 'Small',
        strategy: 'batch',
        chunkSize: CHUNK_SIZE.small,
      };
    }
    if (fileCount <= THRESHOLDS.mediumProject) {
      return {
        name: 'Medium',
        strategy: 'batch',
        chunkSize: CHUNK_SIZE.medium,
      };
    }
    if (fileCount <= THRESHOLDS.largeProject) {
      return {
        name: 'Large',
        strategy: 'chunked',
        chunkSize: CHUNK_SIZE.large,
      };
    }
    return {
      name: 'Massive',
      strategy: 'streaming',
      chunkSize: CHUNK_SIZE.streaming,
    };
  }

  /**
   * Batch analysis for small/medium projects
   */
  async batchAnalyze(files) {
    const results = [];

    for (const file of files) {
      const analysis = await this.analyzeFile(file);
      if (analysis) {
        results.push(analysis);
      }
      this.stats.processedFiles++;
      this.updateProgress();
    }

    return results;
  }

  /**
   * Chunked analysis for large projects
   */
  async chunkedAnalyze(files) {
    const chunkSize = this.options.chunkSize;
    const results = [];

    for (let i = 0; i < files.length; i += chunkSize) {
      const chunk = files.slice(i, i + chunkSize);
      this.stats.chunks++;

      const chunkResults = await Promise.all(chunk.map(file => this.analyzeFile(file)));

      results.push(...chunkResults.filter(r => r !== null));
      this.stats.processedFiles += chunk.length;

      // Memory management
      this.checkMemory();
      this.updateProgress();
    }

    return results;
  }

  /**
   * Streaming analysis for massive projects
   * Uses worker threads for parallel processing
   */
  async streamingAnalyze(files) {
    const chunkSize = this.options.chunkSize;
    const results = [];

    console.log(
      `🚀 Streaming mode: Processing ${files.length.toLocaleString()} files in chunks of ${chunkSize}`
    );

    for (let i = 0; i < files.length; i += chunkSize) {
      const chunk = files.slice(i, i + chunkSize);
      this.stats.chunks++;

      // Process chunk with incremental aggregation
      const chunkResults = await this.processChunk(chunk);

      // Aggregate results incrementally to manage memory
      this.aggregateResults(chunkResults);
      this.stats.processedFiles += chunk.length;

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      this.checkMemory();
      this.updateProgress();

      // Log progress every 10 chunks
      if (this.stats.chunks % 10 === 0) {
        const percent = Math.round((this.stats.processedFiles / files.length) * 100);
        const elapsed = ((Date.now() - this.stats.startTime) / 1000).toFixed(1);
        console.log(`  📦 Chunk ${this.stats.chunks}: ${percent}% complete (${elapsed}s elapsed)`);
      }
    }

    return results;
  }

  /**
   * Process a chunk of files
   */
  async processChunk(files) {
    const results = [];

    for (const file of files) {
      try {
        const analysis = await this.analyzeFile(file);
        if (analysis) {
          results.push(analysis);
        }
      } catch (error) {
        this.stats.errorFiles++;
      }
    }

    return results;
  }

  /**
   * Analyze a single file
   */
  async analyzeFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const stats = await fs.stat(filePath);
      const lines = content.split('\n');
      const language = this.detectLanguage(filePath);

      const analysis = {
        path: path.relative(this.workspaceRoot, filePath),
        absolutePath: filePath,
        language,
        lines: lines.length,
        size: stats.size,
        complexity: this.calculateComplexity(content, language),
        maintainability: 0,
        functions: this.extractFunctions(content, language),
        issues: [],
      };

      // Calculate maintainability
      analysis.maintainability = this.calculateMaintainability(content, analysis.complexity);

      // Detect issues
      analysis.issues = this.detectIssues(analysis);

      return analysis;
    } catch (error) {
      this.stats.errorFiles++;
      return null;
    }
  }

  /**
   * Detect programming language from file extension
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
   * Calculate cyclomatic complexity
   */
  calculateComplexity(code, language) {
    let complexity = 1;

    // Common decision point patterns
    const patterns = [
      /\bif\b/g,
      /\belse\s+if\b/g,
      /\bfor\b/g,
      /\bwhile\b/g,
      /\bcase\b/g,
      /\bcatch\b/g,
      /&&/g,
      /\|\|/g,
      /\?[^:]*:/g, // Ternary
    ];

    // Language-specific patterns
    if (language === 'rust') {
      patterns.push(/\bmatch\b/g, /\b=>\b/g);
    }
    if (language === 'python') {
      patterns.push(/\belif\b/g, /\bexcept\b/g);
    }

    patterns.forEach(pattern => {
      const matches = code.match(pattern);
      if (matches) complexity += matches.length;
    });

    return complexity;
  }

  /**
   * Calculate maintainability index
   */
  calculateMaintainability(code, complexity) {
    const lines = code.split('\n');
    const codeLines = lines.filter(line => {
      const trimmed = line.trim();
      return (
        trimmed.length > 0 &&
        !trimmed.startsWith('//') &&
        !trimmed.startsWith('/*') &&
        !trimmed.startsWith('#')
      );
    }).length;

    const commentLines = lines.filter(line => {
      const trimmed = line.trim();
      return (
        trimmed.startsWith('//') ||
        trimmed.startsWith('/*') ||
        trimmed.startsWith('*') ||
        trimmed.startsWith('#')
      );
    }).length;

    const commentRatio = codeLines > 0 ? commentLines / codeLines : 0;

    const volumeScore = Math.max(0, 100 - Math.log2(codeLines + 1) * 5);
    const complexityScore = Math.max(0, 100 - complexity * 2);
    const commentScore = Math.min(100, commentRatio * 100);

    return Math.round(volumeScore * 0.4 + complexityScore * 0.4 + commentScore * 0.2);
  }

  /**
   * Extract functions from code
   */
  extractFunctions(code, language) {
    const functions = [];
    const lines = code.split('\n');

    // Simple function detection patterns
    const patterns = {
      javascript:
        /(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>))/g,
      typescript:
        /(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>))/g,
      c: /(?:static\s+)?(?:inline\s+)?(?:\w+\s+)+(\w+)\s*\([^)]*\)\s*\{/g,
      cpp: /(?:static\s+)?(?:inline\s+)?(?:virtual\s+)?(?:\w+\s+)+(\w+)\s*\([^)]*\)(?:\s*const)?\s*(?:override)?\s*\{/g,
      python: /def\s+(\w+)\s*\(/g,
      rust: /(?:pub\s+)?(?:async\s+)?fn\s+(\w+)/g,
      go: /func\s+(?:\([^)]+\)\s+)?(\w+)/g,
      java: /(?:public|private|protected)?\s*(?:static)?\s*(?:\w+)\s+(\w+)\s*\([^)]*\)\s*(?:throws\s+\w+(?:,\s*\w+)*)?\s*\{/g,
    };

    const pattern = patterns[language];
    if (!pattern) return functions;

    let match;
    while ((match = pattern.exec(code)) !== null) {
      const name = match[1] || match[2];
      if (name) {
        // Estimate function size (simple heuristic)
        const startIndex = match.index;
        const startLine = code.substring(0, startIndex).split('\n').length;
        const endLine = this.findFunctionEnd(lines, startLine - 1, language);

        functions.push({
          name,
          startLine,
          endLine,
          lines: endLine - startLine + 1,
        });
      }
    }

    return functions;
  }

  /**
   * Find the end of a function (simplified)
   */
  findFunctionEnd(lines, startLine, language) {
    if (language === 'python') {
      // Python: find next line with same or less indentation
      const startIndent = lines[startLine]?.match(/^\s*/)?.[0].length || 0;
      for (let i = startLine + 1; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim() && line.match(/^\s*/)[0].length <= startIndent) {
          return i;
        }
      }
      return lines.length;
    }

    // Brace-based languages
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
   * Detect issues in analyzed file
   */
  detectIssues(analysis) {
    const issues = [];

    // Giant functions
    for (const func of analysis.functions) {
      if (func.lines >= THRESHOLDS.functionLines.extreme) {
        issues.push({
          type: 'giant-function',
          severity: 'extreme',
          message: `Function "${func.name}" has ${func.lines} lines (threshold: ${THRESHOLDS.functionLines.extreme})`,
          function: func.name,
          lines: func.lines,
          recommendations: this.generateFunctionSplitRecommendations(func),
        });
        this.results.giantFunctions.push({
          file: analysis.path,
          ...func,
        });
      } else if (func.lines >= THRESHOLDS.functionLines.critical) {
        issues.push({
          type: 'large-function',
          severity: 'critical',
          message: `Function "${func.name}" has ${func.lines} lines (threshold: ${THRESHOLDS.functionLines.critical})`,
          function: func.name,
          lines: func.lines,
        });
      } else if (func.lines >= THRESHOLDS.functionLines.warning) {
        issues.push({
          type: 'long-function',
          severity: 'warning',
          message: `Function "${func.name}" has ${func.lines} lines (threshold: ${THRESHOLDS.functionLines.warning})`,
          function: func.name,
          lines: func.lines,
        });
      }
    }

    // High file complexity
    if (analysis.complexity >= THRESHOLDS.cyclomaticComplexity.extreme) {
      issues.push({
        type: 'extreme-complexity',
        severity: 'extreme',
        message: `File complexity is ${analysis.complexity} (threshold: ${THRESHOLDS.cyclomaticComplexity.extreme})`,
      });
      this.results.hotspots.push({
        file: analysis.path,
        complexity: analysis.complexity,
        reason: 'extreme-complexity',
      });
    } else if (analysis.complexity >= THRESHOLDS.cyclomaticComplexity.critical) {
      issues.push({
        type: 'high-complexity',
        severity: 'critical',
        message: `File complexity is ${analysis.complexity} (threshold: ${THRESHOLDS.cyclomaticComplexity.critical})`,
      });
    }

    // Low maintainability
    if (analysis.maintainability < 20) {
      issues.push({
        type: 'low-maintainability',
        severity: 'critical',
        message: `Maintainability index is ${analysis.maintainability} (very poor)`,
      });
    }

    return issues;
  }

  /**
   * Generate recommendations for splitting a giant function
   */
  generateFunctionSplitRecommendations(func) {
    const targetCount = Math.ceil(func.lines / 50);
    return [
      `Split "${func.name}" into ${targetCount} smaller functions (target: ~50 lines each)`,
      'Extract helper functions for repeated logic',
      'Consider using the Extract Method refactoring pattern',
      'Group related operations into separate functions by responsibility',
    ];
  }

  /**
   * Aggregate results incrementally for memory efficiency
   */
  aggregateResults(chunkResults) {
    for (const result of chunkResults) {
      // Keep only essential data for summary
      this.results.files.push({
        path: result.path,
        language: result.language,
        lines: result.lines,
        complexity: result.complexity,
        maintainability: result.maintainability,
        issueCount: result.issues.length,
      });
    }
  }

  /**
   * Check memory usage and warn if approaching limit
   */
  checkMemory() {
    const used = process.memoryUsage();
    const heapUsed = used.heapUsed;

    if (heapUsed > this.stats.peakMemory) {
      this.stats.peakMemory = heapUsed;
    }

    if (heapUsed > this.options.memoryLimit * 0.9) {
      console.warn(`⚠️ Memory usage high: ${Math.round(heapUsed / 1024 / 1024)}MB`);
    }
  }

  /**
   * Update progress
   */
  updateProgress() {
    if (this.options.progressCallback) {
      const percent = Math.round((this.stats.processedFiles / this.stats.totalFiles) * 100);
      this.options.progressCallback({
        processed: this.stats.processedFiles,
        total: this.stats.totalFiles,
        percent,
        chunks: this.stats.chunks,
      });
    }
  }

  /**
   * Generate summary from results
   */
  generateSummary(_results) {
    const files = this.results.files;

    this.results.summary = {
      totalFiles: files.length,
      totalLines: files.reduce((sum, f) => sum + f.lines, 0),
      averageComplexity:
        files.length > 0
          ? Math.round(files.reduce((sum, f) => sum + f.complexity, 0) / files.length)
          : 0,
      averageMaintainability:
        files.length > 0
          ? Math.round(files.reduce((sum, f) => sum + f.maintainability, 0) / files.length)
          : 0,
      giantFunctions: this.results.giantFunctions.length,
      hotspots: this.results.hotspots.length,
      languageDistribution: this.calculateLanguageDistribution(files),
      processingTime: this.stats.endTime - this.stats.startTime,
      peakMemoryMB: Math.round(this.stats.peakMemory / 1024 / 1024),
    };
  }

  /**
   * Calculate language distribution
   */
  calculateLanguageDistribution(files) {
    const distribution = {};
    for (const file of files) {
      distribution[file.language] = (distribution[file.language] || 0) + 1;
    }
    return distribution;
  }

  /**
   * Generate overall recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    const summary = this.results.summary;

    if (!summary) return recommendations;

    // Giant functions
    if (this.results.giantFunctions.length > 0) {
      recommendations.push({
        priority: 'P0',
        type: 'refactoring',
        title: 'Split Giant Functions',
        message: `${this.results.giantFunctions.length} functions exceed 1000 lines. These require immediate refactoring.`,
        items: this.results.giantFunctions
          .slice(0, 5)
          .map(f => `${f.file}:${f.name} (${f.lines} lines)`),
      });
    }

    // Hotspots
    if (this.results.hotspots.length > 0) {
      recommendations.push({
        priority: 'P1',
        type: 'complexity',
        title: 'Address Complexity Hotspots',
        message: `${this.results.hotspots.length} files have extreme complexity. Consider breaking them down.`,
        items: this.results.hotspots
          .slice(0, 5)
          .map(h => `${h.file} (complexity: ${h.complexity})`),
      });
    }

    // Low maintainability
    if (summary.averageMaintainability < 40) {
      recommendations.push({
        priority: 'P2',
        type: 'maintainability',
        title: 'Improve Code Maintainability',
        message: `Average maintainability is ${summary.averageMaintainability}. Consider adding comments and simplifying logic.`,
      });
    }

    // Large project recommendations
    if (summary.totalFiles > THRESHOLDS.largeProject) {
      recommendations.push({
        priority: 'P2',
        type: 'architecture',
        title: 'Consider Modular Architecture',
        message: `With ${summary.totalFiles.toLocaleString()} files, consider splitting into modules or microservices.`,
      });
    }

    return recommendations;
  }
}

module.exports = {
  LargeProjectAnalyzer,
  THRESHOLDS,
  CHUNK_SIZE,
};
