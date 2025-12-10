/**
 * MUSUBI Impact Analyzer
 *
 * Analyzes the impact of changes across the codebase
 * Detects affected files, dependencies, and ripple effects
 */

const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');

/**
 * Impact severity levels
 */
const ImpactLevel = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  INFO: 'info',
};

/**
 * Impact categories
 */
const ImpactCategory = {
  REQUIREMENTS: 'requirements',
  DESIGN: 'design',
  CODE: 'code',
  TESTS: 'tests',
  DOCUMENTATION: 'documentation',
  CONFIGURATION: 'configuration',
};

/**
 * ImpactAnalyzer - Analyze change impact across the codebase
 */
class ImpactAnalyzer {
  constructor(workspaceRoot, options = {}) {
    this.workspaceRoot = workspaceRoot;
    this.options = {
      includeTests: true,
      includeDocs: true,
      maxDepth: 3,
      ...options,
    };
    this.dependencyCache = new Map();
  }

  /**
   * Analyze the impact of a delta specification
   */
  async analyzeImpact(delta) {
    const report = {
      id: delta.id,
      type: delta.type,
      target: delta.target,
      timestamp: new Date().toISOString(),
      summary: {
        totalAffected: 0,
        byCategory: {},
        byLevel: {},
      },
      affectedItems: [],
      dependencyChain: [],
      recommendations: [],
      risks: [],
    };

    // Initialize counters
    Object.values(ImpactCategory).forEach(cat => {
      report.summary.byCategory[cat] = 0;
    });
    Object.values(ImpactLevel).forEach(level => {
      report.summary.byLevel[level] = 0;
    });

    // Analyze based on delta type
    switch (delta.type) {
      case 'ADDED':
        await this.analyzeAddedImpact(delta, report);
        break;
      case 'MODIFIED':
        await this.analyzeModifiedImpact(delta, report);
        break;
      case 'REMOVED':
        await this.analyzeRemovedImpact(delta, report);
        break;
      case 'RENAMED':
        await this.analyzeRenamedImpact(delta, report);
        break;
    }

    // Analyze dependencies
    if (delta.impactedAreas && delta.impactedAreas.length > 0) {
      await this.analyzeDependencies(delta.impactedAreas, report);
    }

    // Generate recommendations
    this.generateRecommendations(report);

    // Identify risks
    this.identifyRisks(report);

    // Calculate totals
    report.summary.totalAffected = report.affectedItems.length;

    return report;
  }

  /**
   * Analyze impact of ADDED delta
   */
  async analyzeAddedImpact(delta, report) {
    // New items typically have minimal immediate impact
    // but may require integration work

    // Check if target pattern matches existing files
    const existingFiles = await this.findMatchingFiles(delta.target);

    if (existingFiles.length > 0) {
      report.affectedItems.push({
        type: ImpactCategory.CODE,
        path: delta.target,
        level: ImpactLevel.MEDIUM,
        reason: 'New component may need integration with existing files',
        files: existingFiles,
      });
      report.summary.byCategory[ImpactCategory.CODE]++;
      report.summary.byLevel[ImpactLevel.MEDIUM]++;
    }

    // Check for test requirements
    if (this.options.includeTests) {
      report.affectedItems.push({
        type: ImpactCategory.TESTS,
        path: `tests/${delta.target}`,
        level: ImpactLevel.INFO,
        reason: 'New tests should be created for the added component',
        files: [],
      });
      report.summary.byCategory[ImpactCategory.TESTS]++;
      report.summary.byLevel[ImpactLevel.INFO]++;
    }

    // Check for documentation requirements
    if (this.options.includeDocs) {
      report.affectedItems.push({
        type: ImpactCategory.DOCUMENTATION,
        path: `docs/${delta.target}`,
        level: ImpactLevel.INFO,
        reason: 'Documentation should be created for the new component',
        files: [],
      });
      report.summary.byCategory[ImpactCategory.DOCUMENTATION]++;
      report.summary.byLevel[ImpactLevel.INFO]++;
    }
  }

  /**
   * Analyze impact of MODIFIED delta
   */
  async analyzeModifiedImpact(delta, report) {
    // Modified items can have significant ripple effects

    // Find files that reference the target
    const referencingFiles = await this.findReferencingFiles(delta.target);

    for (const file of referencingFiles) {
      const level = this.determineImpactLevel(file, delta);
      const category = this.categorizeFile(file);

      report.affectedItems.push({
        type: category,
        path: file,
        level,
        reason: `References ${delta.target} which is being modified`,
        files: [file],
      });

      report.summary.byCategory[category]++;
      report.summary.byLevel[level]++;
    }

    // Check for test updates
    if (this.options.includeTests) {
      const testFiles = await this.findRelatedTests(delta.target);

      for (const testFile of testFiles) {
        report.affectedItems.push({
          type: ImpactCategory.TESTS,
          path: testFile,
          level: ImpactLevel.HIGH,
          reason: 'Tests may need updates due to modified behavior',
          files: [testFile],
        });

        report.summary.byCategory[ImpactCategory.TESTS]++;
        report.summary.byLevel[ImpactLevel.HIGH]++;
      }
    }
  }

  /**
   * Analyze impact of REMOVED delta
   */
  async analyzeRemovedImpact(delta, report) {
    // Removed items can break dependencies

    // Find files that depend on the target
    const dependentFiles = await this.findReferencingFiles(delta.target);

    for (const file of dependentFiles) {
      report.affectedItems.push({
        type: this.categorizeFile(file),
        path: file,
        level: ImpactLevel.CRITICAL,
        reason: `Depends on ${delta.target} which is being removed`,
        files: [file],
      });

      report.summary.byCategory[this.categorizeFile(file)]++;
      report.summary.byLevel[ImpactLevel.CRITICAL]++;
    }

    // All related tests become obsolete
    if (this.options.includeTests) {
      const testFiles = await this.findRelatedTests(delta.target);

      for (const testFile of testFiles) {
        report.affectedItems.push({
          type: ImpactCategory.TESTS,
          path: testFile,
          level: ImpactLevel.HIGH,
          reason: 'Tests for removed component should be removed',
          files: [testFile],
        });

        report.summary.byCategory[ImpactCategory.TESTS]++;
        report.summary.byLevel[ImpactLevel.HIGH]++;
      }
    }
  }

  /**
   * Analyze impact of RENAMED delta
   */
  async analyzeRenamedImpact(delta, report) {
    // Renamed items require updating all references

    const referencingFiles = await this.findReferencingFiles(delta.before || delta.target);

    for (const file of referencingFiles) {
      report.affectedItems.push({
        type: this.categorizeFile(file),
        path: file,
        level: ImpactLevel.MEDIUM,
        reason: `References old name that needs to be updated`,
        files: [file],
      });

      report.summary.byCategory[this.categorizeFile(file)]++;
      report.summary.byLevel[ImpactLevel.MEDIUM]++;
    }

    // Update test imports
    if (this.options.includeTests) {
      const testFiles = await this.findRelatedTests(delta.before || delta.target);

      for (const testFile of testFiles) {
        report.affectedItems.push({
          type: ImpactCategory.TESTS,
          path: testFile,
          level: ImpactLevel.MEDIUM,
          reason: 'Test imports need to be updated for renamed component',
          files: [testFile],
        });

        report.summary.byCategory[ImpactCategory.TESTS]++;
        report.summary.byLevel[ImpactLevel.MEDIUM]++;
      }
    }
  }

  /**
   * Analyze dependency chain
   */
  async analyzeDependencies(areas, report, depth = 0) {
    if (depth >= this.options.maxDepth) {
      return;
    }

    for (const area of areas) {
      const deps = await this.getDependencies(area);

      report.dependencyChain.push({
        area,
        depth,
        dependencies: deps,
      });

      // Recursively analyze dependencies
      if (deps.length > 0) {
        await this.analyzeDependencies(deps, report, depth + 1);
      }
    }
  }

  /**
   * Find files matching a pattern
   */
  async findMatchingFiles(pattern) {
    try {
      // Convert pattern to glob
      const globPattern = this.patternToGlob(pattern);
      const files = glob.sync(globPattern, {
        cwd: this.workspaceRoot,
        ignore: ['node_modules/**', '.git/**'],
        absolute: false,
      });
      return files;
    } catch (error) {
      return [];
    }
  }

  /**
   * Find files that reference a target
   */
  async findReferencingFiles(target) {
    const results = [];
    const searchPatterns = ['**/*.js', '**/*.ts', '**/*.md', '**/*.json'];

    // Extract searchable name from target
    const searchName = this.extractSearchName(target);

    for (const pattern of searchPatterns) {
      const files = glob.sync(pattern, {
        cwd: this.workspaceRoot,
        ignore: ['node_modules/**', '.git/**', 'coverage/**'],
        absolute: false,
      });

      for (const file of files) {
        const fullPath = path.join(this.workspaceRoot, file);
        try {
          const content = await fs.readFile(fullPath, 'utf-8');
          if (content.includes(searchName)) {
            results.push(file);
          }
        } catch (error) {
          // Skip files that can't be read
        }
      }
    }

    return [...new Set(results)];
  }

  /**
   * Find related test files
   */
  async findRelatedTests(target) {
    const searchName = this.extractSearchName(target);
    const testPatterns = [
      `tests/**/*${searchName}*.test.js`,
      `tests/**/*${searchName}*.spec.js`,
      `**/__tests__/*${searchName}*.js`,
    ];

    const results = [];

    for (const pattern of testPatterns) {
      const files = glob.sync(pattern, {
        cwd: this.workspaceRoot,
        ignore: ['node_modules/**'],
        absolute: false,
      });
      results.push(...files);
    }

    return [...new Set(results)];
  }

  /**
   * Get dependencies for an area
   */
  async getDependencies(area) {
    // Check cache
    if (this.dependencyCache.has(area)) {
      return this.dependencyCache.get(area);
    }

    const deps = [];
    const searchName = this.extractSearchName(area);

    // Look for require/import statements
    const codeFiles = glob.sync('**/*.js', {
      cwd: this.workspaceRoot,
      ignore: ['node_modules/**', '.git/**', 'coverage/**'],
      absolute: false,
    });

    for (const file of codeFiles) {
      const fullPath = path.join(this.workspaceRoot, file);
      try {
        const content = await fs.readFile(fullPath, 'utf-8');

        // Match require statements
        const requireMatches = content.matchAll(/require\(['"]([^'"]+)['"]\)/g);
        for (const match of requireMatches) {
          if (match[1].includes(searchName)) {
            deps.push(file);
          }
        }

        // Match import statements
        const importMatches = content.matchAll(/import.*from\s+['"]([^'"]+)['"]/g);
        for (const match of importMatches) {
          if (match[1].includes(searchName)) {
            deps.push(file);
          }
        }
      } catch (error) {
        // Skip
      }
    }

    // Cache result
    const uniqueDeps = [...new Set(deps)];
    this.dependencyCache.set(area, uniqueDeps);

    return uniqueDeps;
  }

  /**
   * Generate recommendations based on impact analysis
   */
  generateRecommendations(report) {
    const recommendations = [];

    // Based on affected items count
    if (report.summary.totalAffected > 10) {
      recommendations.push({
        priority: 'high',
        message: 'Consider splitting this change into smaller incremental changes',
      });
    }

    // Based on critical impacts
    if (report.summary.byLevel[ImpactLevel.CRITICAL] > 0) {
      recommendations.push({
        priority: 'critical',
        message: 'Critical dependencies detected. Ensure thorough testing before deployment.',
      });
    }

    // Based on test impact
    if (report.summary.byCategory[ImpactCategory.TESTS] > 5) {
      recommendations.push({
        priority: 'high',
        message: 'Significant test updates required. Plan additional testing time.',
      });
    }

    // Based on deep dependency chain
    if (report.dependencyChain.length > 3) {
      recommendations.push({
        priority: 'medium',
        message: 'Deep dependency chain detected. Consider refactoring to reduce coupling.',
      });
    }

    // Add default recommendations
    recommendations.push({
      priority: 'info',
      message: 'Run full test suite before merging this change.',
    });

    recommendations.push({
      priority: 'info',
      message: 'Update documentation to reflect the changes.',
    });

    report.recommendations = recommendations;
  }

  /**
   * Identify risks based on impact analysis
   */
  identifyRisks(report) {
    const risks = [];

    // Critical impact risks
    if (report.summary.byLevel[ImpactLevel.CRITICAL] > 0) {
      risks.push({
        level: 'high',
        description: 'Breaking changes detected that may affect production',
        mitigation: 'Ensure backward compatibility or plan migration strategy',
      });
    }

    // High code impact
    if (report.summary.byCategory[ImpactCategory.CODE] > 10) {
      risks.push({
        level: 'medium',
        description: 'Large number of code files affected',
        mitigation: 'Consider phased rollout and feature flags',
      });
    }

    // Test coverage gaps
    if (
      report.summary.byCategory[ImpactCategory.CODE] >
      report.summary.byCategory[ImpactCategory.TESTS]
    ) {
      risks.push({
        level: 'medium',
        description: 'Affected code may not have sufficient test coverage',
        mitigation: 'Add additional tests before deployment',
      });
    }

    report.risks = risks;
  }

  /**
   * Determine impact level for a file
   */
  determineImpactLevel(file, _delta) {
    // Core modules get higher impact
    if (file.includes('src/') && !file.includes('test')) {
      return ImpactLevel.HIGH;
    }

    // Test files get medium impact
    if (file.includes('test') || file.includes('spec')) {
      return ImpactLevel.MEDIUM;
    }

    // Documentation gets low impact
    if (file.includes('docs/') || file.endsWith('.md')) {
      return ImpactLevel.LOW;
    }

    return ImpactLevel.MEDIUM;
  }

  /**
   * Categorize a file by its location/type
   */
  categorizeFile(file) {
    if (file.includes('test') || file.includes('spec')) {
      return ImpactCategory.TESTS;
    }
    if (file.includes('docs/') || file.endsWith('.md')) {
      return ImpactCategory.DOCUMENTATION;
    }
    if (file.includes('config') || file.endsWith('.json') || file.endsWith('.yml')) {
      return ImpactCategory.CONFIGURATION;
    }
    if (file.includes('src/')) {
      return ImpactCategory.CODE;
    }
    return ImpactCategory.CODE;
  }

  /**
   * Convert a target pattern to a glob pattern
   */
  patternToGlob(pattern) {
    // If it looks like a file path, use as-is with wildcards
    if (pattern.includes('/') || pattern.includes('.')) {
      return `**/*${pattern}*`;
    }

    // Otherwise, search for the name in any file
    return `**/*${pattern}*`;
  }

  /**
   * Extract a searchable name from a target
   */
  extractSearchName(target) {
    // Handle REQ-XXX-NNN format
    const reqMatch = target.match(/REQ-([A-Z]+)-\d+/);
    if (reqMatch) {
      return target;
    }

    // Handle file paths
    const parts = target.split('/');
    const filename = parts[parts.length - 1];

    // Remove extension if present
    const nameWithoutExt = filename.replace(/\.[^.]+$/, '');

    return nameWithoutExt || target;
  }

  /**
   * Generate impact summary
   */
  generateSummary(report) {
    const lines = [];

    lines.push(`## Impact Analysis Summary`);
    lines.push(``);
    lines.push(`**Change ID**: ${report.id}`);
    lines.push(`**Type**: ${report.type}`);
    lines.push(`**Target**: ${report.target}`);
    lines.push(`**Analyzed**: ${report.timestamp}`);
    lines.push(``);

    lines.push(`### Affected Items: ${report.summary.totalAffected}`);
    lines.push(``);
    lines.push(`| Category | Count |`);
    lines.push(`|----------|-------|`);

    for (const [category, count] of Object.entries(report.summary.byCategory)) {
      if (count > 0) {
        lines.push(`| ${category} | ${count} |`);
      }
    }

    lines.push(``);
    lines.push(`### Impact Levels`);
    lines.push(``);
    lines.push(`| Level | Count |`);
    lines.push(`|-------|-------|`);

    for (const [level, count] of Object.entries(report.summary.byLevel)) {
      if (count > 0) {
        const emoji =
          {
            critical: '🔴',
            high: '🟠',
            medium: '🟡',
            low: '🟢',
            info: 'ℹ️',
          }[level] || '';
        lines.push(`| ${emoji} ${level} | ${count} |`);
      }
    }

    if (report.risks.length > 0) {
      lines.push(``);
      lines.push(`### Risks`);
      lines.push(``);

      report.risks.forEach(risk => {
        lines.push(`- **${risk.level.toUpperCase()}**: ${risk.description}`);
        lines.push(`  - Mitigation: ${risk.mitigation}`);
      });
    }

    if (report.recommendations.length > 0) {
      lines.push(``);
      lines.push(`### Recommendations`);
      lines.push(``);

      report.recommendations.forEach(rec => {
        const emoji =
          {
            critical: '🔴',
            high: '🟠',
            medium: '🟡',
            info: 'ℹ️',
          }[rec.priority] || '•';
        lines.push(`${emoji} ${rec.message}`);
      });
    }

    return lines.join('\n');
  }
}

module.exports = {
  ImpactAnalyzer,
  ImpactLevel,
  ImpactCategory,
};
