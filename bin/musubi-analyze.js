#!/usr/bin/env node

/**
 * MUSUBI Analyze - Intelligent Code Quality Analysis
 *
 * Analyzes codebase for:
 * - Code quality metrics (complexity, maintainability)
 * - Technical debt detection
 * - Dependency analysis
 * - Security vulnerabilities
 * - CodeGraph MCP integration for code structure analysis
 *
 * @version 3.6.1
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const { program } = require('commander');
const { glob } = require('glob');
const { execSync, spawn } = require('child_process');

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  excludePatterns: [
    'node_modules/**',
    'dist/**',
    'build/**',
    '.git/**',
    'coverage/**',
    '*.min.js',
    '*.bundle.js',
  ],
  thresholds: {
    complexity: {
      low: 5,
      medium: 10,
      high: 20,
    },
    maintainability: {
      excellent: 80,
      good: 60,
      moderate: 40,
      poor: 20,
    },
    fileSize: {
      small: 200,
      medium: 500,
      large: 1000,
    },
  },
};

// ============================================================================
// CLI Setup
// ============================================================================

program
  .name('musubi-analyze')
  .description('Analyze codebase for quality, complexity, and technical debt')
  .version('3.6.1')
  .option('-t, --type <type>', 'Analysis type: quality, dependencies, security, stuck, codegraph, all', 'all')
  .option('-o, --output <file>', 'Output file for analysis report')
  .option('--json', 'Output in JSON format')
  .option('--threshold <level>', 'Quality threshold: low, medium, high', 'medium')
  .option('--detect-stuck', 'Detect stuck agent patterns (repetitive errors, circular edits)')
  .option('--codegraph', 'Run CodeGraph MCP index and update steering/memories/codegraph.md')
  .option('--codegraph-full', 'Run full CodeGraph MCP index (not incremental)')
  .option('-v, --verbose', 'Verbose output')
  .parse(process.argv);

const options = program.opts();

// ============================================================================
// Utility Functions
// ============================================================================

function log(message, type = 'info') {
  const icons = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌',
    analyze: '🔍',
  };

  const colors = {
    info: chalk.blue,
    success: chalk.green,
    warning: chalk.yellow,
    error: chalk.red,
    analyze: chalk.cyan,
  };

  const color = colors[type] || chalk.white;
  console.log(`${icons[type] || '•'} ${color(message)}`);
}

function calculateComplexity(code) {
  // Simplified cyclomatic complexity calculation
  let complexity = 1; // Base complexity

  // Count decision points
  const patterns = [
    /\bif\b/g,
    /\belse\s+if\b/g,
    /\bfor\b/g,
    /\bwhile\b/g,
    /\bcase\b/g,
    /\bcatch\b/g,
    /&&/g,
    /\|\|/g,
    /\?/g, // Ternary operator
  ];

  patterns.forEach(pattern => {
    const matches = code.match(pattern);
    if (matches) complexity += matches.length;
  });

  return complexity;
}

function calculateMaintainability(code, complexity) {
  // Simplified maintainability index
  // Based on: lines of code, complexity, comment ratio

  const lines = code.split('\n');
  const codeLines = lines.filter(line => {
    const trimmed = line.trim();
    return trimmed.length > 0 && !trimmed.startsWith('//') && !trimmed.startsWith('/*');
  }).length;

  const commentLines = lines.filter(line => {
    const trimmed = line.trim();
    return trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*');
  }).length;

  const commentRatio = codeLines > 0 ? commentLines / codeLines : 0;

  // Maintainability Index formula (simplified)
  const volumeScore = Math.max(0, 100 - Math.log2(codeLines + 1) * 5);
  const complexityScore = Math.max(0, 100 - complexity * 2);
  const commentScore = Math.min(100, commentRatio * 100);

  const maintainability = volumeScore * 0.4 + complexityScore * 0.4 + commentScore * 0.2;

  return Math.round(maintainability);
}

function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const complexity = calculateComplexity(content);
    const maintainability = calculateMaintainability(content, complexity);

    return {
      path: filePath,
      lines: lines.length,
      complexity,
      maintainability,
      size: fs.statSync(filePath).size,
    };
  } catch (error) {
    if (options.verbose) {
      log(`Error analyzing ${filePath}: ${error.message}`, 'error');
    }
    return null;
  }
}

function getComplexityLevel(complexity) {
  const { low, medium, high } = CONFIG.thresholds.complexity;
  if (complexity <= low) return { level: 'Low', color: chalk.green };
  if (complexity <= medium) return { level: 'Medium', color: chalk.yellow };
  if (complexity <= high) return { level: 'High', color: chalk.red };
  return { level: 'Very High', color: chalk.red.bold };
}

function getMaintainabilityLevel(score) {
  const { excellent, good, moderate, poor } = CONFIG.thresholds.maintainability;
  if (score >= excellent) return { level: 'Excellent', color: chalk.green.bold };
  if (score >= good) return { level: 'Good', color: chalk.green };
  if (score >= moderate) return { level: 'Moderate', color: chalk.yellow };
  if (score >= poor) return { level: 'Poor', color: chalk.red };
  return { level: 'Critical', color: chalk.red.bold };
}

// ============================================================================
// Analysis Functions
// ============================================================================

async function analyzeQuality() {
  log('Code Quality Analysis', 'analyze');
  console.log();

  // Find all JavaScript/TypeScript files
  const patterns = ['**/*.js', '**/*.ts', '**/*.jsx', '**/*.tsx'];
  let allFiles = [];

  for (const pattern of patterns) {
    const files = await glob(pattern, {
      ignore: CONFIG.excludePatterns,
      nodir: true,
    });
    allFiles = allFiles.concat(Array.isArray(files) ? files : []);
  }

  if (allFiles.length === 0) {
    log('No JavaScript/TypeScript files found', 'warning');
    return { files: [], summary: null };
  }

  log(`Analyzing ${allFiles.length} files...`, 'info');
  console.log();

  const results = [];
  let totalComplexity = 0;
  let totalMaintainability = 0;

  for (const file of allFiles) {
    const analysis = analyzeFile(file);
    if (analysis) {
      results.push(analysis);
      totalComplexity += analysis.complexity;
      totalMaintainability += analysis.maintainability;
    }
  }

  // Sort by complexity (highest first)
  results.sort((a, b) => b.complexity - a.complexity);

  // Summary
  const summary = {
    totalFiles: results.length,
    averageComplexity: Math.round(totalComplexity / results.length),
    averageMaintainability: Math.round(totalMaintainability / results.length),
    highComplexityFiles: results.filter(r => r.complexity > CONFIG.thresholds.complexity.high)
      .length,
    lowMaintainabilityFiles: results.filter(
      r => r.maintainability < CONFIG.thresholds.maintainability.moderate
    ).length,
  };

  // Display top 10 most complex files
  console.log(chalk.bold('📊 Top 10 Most Complex Files:'));
  console.log();

  results.slice(0, 10).forEach((file, index) => {
    const complexityInfo = getComplexityLevel(file.complexity);
    const maintInfo = getMaintainabilityLevel(file.maintainability);

    console.log(`${index + 1}. ${chalk.cyan(file.path)}`);
    console.log(
      `   Lines: ${file.lines} | Complexity: ${complexityInfo.color(file.complexity)} (${complexityInfo.level}) | Maintainability: ${maintInfo.color(file.maintainability)} (${maintInfo.level})`
    );
    console.log();
  });

  // Display summary
  console.log(chalk.bold('📈 Summary:'));
  console.log();
  console.log(`Total Files Analyzed: ${summary.totalFiles}`);
  console.log(`Average Complexity: ${summary.averageComplexity}`);
  console.log(`Average Maintainability: ${summary.averageMaintainability}`);
  console.log(`High Complexity Files: ${chalk.red(summary.highComplexityFiles)}`);
  console.log(`Low Maintainability Files: ${chalk.red(summary.lowMaintainabilityFiles)}`);
  console.log();

  return { files: results, summary };
}

async function analyzeDependencies() {
  log('Dependency Analysis', 'analyze');
  console.log();

  const packagePath = path.join(process.cwd(), 'package.json');

  if (!fs.existsSync(packagePath)) {
    log('No package.json found', 'warning');
    return { dependencies: [], devDependencies: [] };
  }

  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const deps = pkg.dependencies || {};
  const devDeps = pkg.devDependencies || {};

  console.log(chalk.bold('📦 Production Dependencies:'));
  console.log();
  Object.entries(deps).forEach(([name, version]) => {
    console.log(`  ${chalk.green('•')} ${chalk.cyan(name)}: ${version}`);
  });
  console.log();

  console.log(chalk.bold('🛠️  Development Dependencies:'));
  console.log();
  Object.entries(devDeps).forEach(([name, version]) => {
    console.log(`  ${chalk.yellow('•')} ${chalk.cyan(name)}: ${version}`);
  });
  console.log();

  console.log(chalk.bold('📊 Summary:'));
  console.log();
  console.log(`Total Dependencies: ${Object.keys(deps).length}`);
  console.log(`Total DevDependencies: ${Object.keys(devDeps).length}`);
  console.log();

  return {
    dependencies: Object.entries(deps).map(([name, version]) => ({ name, version })),
    devDependencies: Object.entries(devDeps).map(([name, version]) => ({ name, version })),
  };
}

async function analyzeSecurity() {
  log('Security Analysis', 'analyze');
  console.log();

  log('Running npm audit...', 'info');
  console.log();

  const { execSync } = require('child_process');

  try {
    const output = execSync('npm audit --json', { encoding: 'utf8' });
    const auditResult = JSON.parse(output);

    const vulnerabilities = auditResult.metadata?.vulnerabilities || {};
    const total = Object.values(vulnerabilities).reduce((sum, count) => sum + count, 0);

    console.log(chalk.bold('🔒 Security Vulnerabilities:'));
    console.log();
    console.log(`Critical: ${chalk.red.bold(vulnerabilities.critical || 0)}`);
    console.log(`High: ${chalk.red(vulnerabilities.high || 0)}`);
    console.log(`Moderate: ${chalk.yellow(vulnerabilities.moderate || 0)}`);
    console.log(`Low: ${chalk.green(vulnerabilities.low || 0)}`);
    console.log();
    console.log(
      `Total: ${total === 0 ? chalk.green('No vulnerabilities found! ✨') : chalk.red(total)}`
    );
    console.log();

    if (total > 0) {
      log('Run "npm audit fix" to fix vulnerabilities', 'warning');
      console.log();
    }

    return vulnerabilities;
  } catch (error) {
    log('npm audit failed. Make sure npm is installed.', 'error');
    return {};
  }
}

async function generateReport(analysisData) {
  const timestamp = new Date().toISOString().split('T')[0];
  const reportPath = options.output || `steering/memories/code_quality_report_${timestamp}.md`;

  let report = '# Code Quality Analysis Report\n\n';
  report += `**Generated**: ${new Date().toISOString()}\n`;
  report += '**Version**: MUSUBI v0.5.0\n\n';

  if (analysisData.quality && analysisData.quality.summary) {
    const { summary } = analysisData.quality;
    report += '## Quality Metrics\n\n';
    report += `- Total Files: ${summary.totalFiles}\n`;
    report += `- Average Complexity: ${summary.averageComplexity}\n`;
    report += `- Average Maintainability: ${summary.averageMaintainability}\n`;
    report += `- High Complexity Files: ${summary.highComplexityFiles}\n`;
    report += `- Low Maintainability Files: ${summary.lowMaintainabilityFiles}\n\n`;

    report += '### Recommendations\n\n';
    if (summary.highComplexityFiles > 0) {
      report += `- ⚠️ ${summary.highComplexityFiles} files have high complexity. Consider refactoring.\n`;
    }
    if (summary.lowMaintainabilityFiles > 0) {
      report += `- ⚠️ ${summary.lowMaintainabilityFiles} files have low maintainability. Add comments and simplify logic.\n`;
    }
    if (summary.highComplexityFiles === 0 && summary.lowMaintainabilityFiles === 0) {
      report += '- ✅ Code quality is excellent!\n';
    }
    report += '\n';
  }

  if (analysisData.dependencies) {
    report += '## Dependencies\n\n';
    report += `- Production: ${analysisData.dependencies.dependencies.length}\n`;
    report += `- Development: ${analysisData.dependencies.devDependencies.length}\n\n`;
  }

  if (analysisData.security) {
    const total = Object.values(analysisData.security).reduce((sum, count) => sum + count, 0);
    report += '## Security\n\n';
    report += `- Total Vulnerabilities: ${total}\n`;
    report += `- Critical: ${analysisData.security.critical || 0}\n`;
    report += `- High: ${analysisData.security.high || 0}\n`;
    report += `- Moderate: ${analysisData.security.moderate || 0}\n`;
    report += `- Low: ${analysisData.security.low || 0}\n\n`;
  }

  report += '---\n\n';
  report += '*Generated by MUSUBI v0.5.0*\n';

  fs.ensureDirSync(path.dirname(reportPath));
  fs.writeFileSync(reportPath, report);

  log(`Report saved to: ${reportPath}`, 'success');
}

// ============================================================================
// CodeGraph MCP Integration
// ============================================================================

/**
 * Check if CodeGraph MCP is installed
 * @returns {boolean} True if codegraph-mcp is available
 */
function isCodeGraphInstalled() {
  try {
    execSync('codegraph-mcp --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Run CodeGraph MCP index command
 * @param {boolean} full - Whether to run full index (not incremental)
 * @returns {Promise<Object>} Index results
 */
async function runCodeGraphIndex(full = false) {
  return new Promise((resolve, reject) => {
    const args = ['index', '.'];
    if (full) {
      args.push('--full');
    }
    
    log(`Running CodeGraph MCP index (${full ? 'full' : 'incremental'})...`, 'analyze');
    
    const proc = spawn('codegraph-mcp', args, {
      cwd: process.cwd(),
      stdio: ['inherit', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => {
      stdout += data.toString();
      if (options.verbose) {
        process.stdout.write(data);
      }
    });
    
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, output: stdout });
      } else {
        reject(new Error(`CodeGraph index failed: ${stderr}`));
      }
    });
  });
}

/**
 * Get CodeGraph MCP statistics
 * @returns {Promise<Object>} Statistics object
 */
async function getCodeGraphStats() {
  return new Promise((resolve, reject) => {
    const proc = spawn('codegraph-mcp', ['stats', '.'], {
      cwd: process.cwd(),
      stdio: ['inherit', 'pipe', 'pipe']
    });
    
    let stdout = '';
    
    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        // Parse the stats output
        const stats = parseCodeGraphStats(stdout);
        resolve(stats);
      } else {
        reject(new Error('Failed to get CodeGraph stats'));
      }
    });
  });
}

/**
 * Parse CodeGraph MCP stats output
 * @param {string} output - Raw stats output
 * @returns {Object} Parsed statistics
 */
function parseCodeGraphStats(output) {
  const stats = {
    entities: 0,
    relations: 0,
    communities: 0,
    files: 0,
    entityTypes: {}
  };
  
  const lines = output.split('\n');
  let inEntityTypes = false;
  
  for (const line of lines) {
    if (line.startsWith('Entities:')) {
      stats.entities = parseInt(line.split(':')[1].trim(), 10);
    } else if (line.startsWith('Relations:')) {
      stats.relations = parseInt(line.split(':')[1].trim(), 10);
    } else if (line.startsWith('Communities:')) {
      stats.communities = parseInt(line.split(':')[1].trim(), 10);
    } else if (line.startsWith('Files:')) {
      stats.files = parseInt(line.split(':')[1].trim(), 10);
    } else if (line.includes('Entities by type:')) {
      inEntityTypes = true;
    } else if (inEntityTypes && line.trim().startsWith('-')) {
      const match = line.match(/-\s*(\w+):\s*(\d+)/);
      if (match) {
        stats.entityTypes[match[1]] = parseInt(match[2], 10);
      }
    }
  }
  
  return stats;
}

/**
 * Generate CodeGraph report in steering/memories/codegraph.md
 * @param {Object} stats - CodeGraph statistics
 */
async function generateCodeGraphReport(stats) {
  const reportPath = 'steering/memories/codegraph.md';
  const timestamp = new Date().toISOString();
  const version = require('../package.json').version;
  
  let report = `# CodeGraph MCP Index Report

**Generated**: ${timestamp}
**Version**: MUSUBI v${version}
**Indexed by**: CodeGraph MCP Server

---

## Graph Statistics

| Metric | Value |
|--------|-------|
| Entities | ${stats.entities.toLocaleString()} |
| Relations | ${stats.relations.toLocaleString()} |
| Communities | ${stats.communities} |
| Files Indexed | ${stats.files.toLocaleString()} |

## Entity Types

| Type | Count |
|------|-------|
`;

  for (const [type, count] of Object.entries(stats.entityTypes)) {
    report += `| ${type} | ${count.toLocaleString()} |\n`;
  }

  report += `
---

## Usage

CodeGraph MCP provides AI assistants with deep code understanding:

\`\`\`bash
# Re-index (incremental)
codegraph-mcp index .

# Full re-index
codegraph-mcp index . --full

# View stats
codegraph-mcp stats .

# Start MCP server
codegraph-mcp serve --repo .
\`\`\`

---

*Generated by MUSUBI v${version} using CodeGraph MCP Server*
`;

  fs.ensureDirSync(path.dirname(reportPath));
  fs.writeFileSync(reportPath, report);
  
  log(`CodeGraph report saved to: ${reportPath}`, 'success');
  
  return reportPath;
}

/**
 * Run CodeGraph MCP analysis
 * @param {boolean} full - Whether to run full index
 * @returns {Promise<Object>} Analysis results
 */
async function analyzeCodeGraph(full = false) {
  log('CodeGraph MCP Analysis', 'analyze');
  console.log();
  
  // Check if CodeGraph MCP is installed
  if (!isCodeGraphInstalled()) {
    log('CodeGraph MCP is not installed. Install with:', 'warning');
    console.log(chalk.cyan('  pipx install codegraph-mcp-server'));
    console.log();
    return null;
  }
  
  try {
    // Run index
    await runCodeGraphIndex(full);
    console.log();
    
    // Get statistics
    const stats = await getCodeGraphStats();
    
    // Display stats
    console.log(chalk.bold('CodeGraph Statistics:'));
    console.log(`  Entities:    ${chalk.green(stats.entities.toLocaleString())}`);
    console.log(`  Relations:   ${chalk.green(stats.relations.toLocaleString())}`);
    console.log(`  Communities: ${chalk.green(stats.communities)}`);
    console.log(`  Files:       ${chalk.green(stats.files.toLocaleString())}`);
    console.log();
    
    if (Object.keys(stats.entityTypes).length > 0) {
      console.log(chalk.bold('Entity Types:'));
      for (const [type, count] of Object.entries(stats.entityTypes)) {
        console.log(`  ${type}: ${chalk.cyan(count.toLocaleString())}`);
      }
      console.log();
    }
    
    // Generate report
    await generateCodeGraphReport(stats);
    
    return stats;
  } catch (error) {
    log(`CodeGraph analysis failed: ${error.message}`, 'error');
    return null;
  }
}

// ============================================================================
// Stuck Detection Analysis
// ============================================================================

async function analyzeStuckPatterns() {
  log('Stuck Pattern Analysis', 'analyze');
  console.log();

  const stuckPatterns = {
    isStuck: false,
    confidence: 0,
    patterns: [],
    suggestions: []
  };

  try {
    // Check git log for repetitive patterns
    const { execSync } = require('child_process');
    
    // Get recent commits
    let commits = [];
    try {
      const gitLog = execSync(
        'git log --oneline -20 --format="%h|%s" 2>/dev/null',
        { encoding: 'utf8' }
      ).trim();
      commits = gitLog.split('\n').filter(Boolean).map(line => {
        const [hash, ...msgParts] = line.split('|');
        return { hash, message: msgParts.join('|') };
      });
    } catch {
      // Not in git repo or no commits
    }

    // Pattern 1: Repetitive revert/fix cycles
    const revertPattern = commits.filter(c => 
      c.message.toLowerCase().includes('revert') ||
      c.message.toLowerCase().includes('undo')
    );
    if (revertPattern.length >= 3) {
      stuckPatterns.patterns.push({
        type: 'revert-cycle',
        severity: 'high',
        message: `${revertPattern.length} revert commits detected in recent history`,
        commits: revertPattern.slice(0, 3).map(c => c.message)
      });
      stuckPatterns.confidence += 30;
    }

    // Pattern 2: Same file edited repeatedly
    let _recentChanges = [];
    try {
      const gitDiff = execSync(
        'git diff --stat HEAD~5 HEAD 2>/dev/null',
        { encoding: 'utf8' }
      ).trim();
      _recentChanges = gitDiff.split('\n').filter(Boolean);
    } catch {
      // No recent changes or not enough history
    }

    const fileEditCounts = {};
    for (let i = 0; i < Math.min(commits.length, 10); i++) {
      try {
        const files = execSync(
          `git show --name-only --format= ${commits[i].hash} 2>/dev/null`,
          { encoding: 'utf8' }
        ).trim().split('\n').filter(Boolean);
        files.forEach(f => {
          fileEditCounts[f] = (fileEditCounts[f] || 0) + 1;
        });
      } catch {
        // Skip this commit
      }
    }

    const frequentlyEdited = Object.entries(fileEditCounts)
      .filter(([, count]) => count >= 4)
      .map(([file, count]) => ({ file, count }));

    if (frequentlyEdited.length > 0) {
      stuckPatterns.patterns.push({
        type: 'circular-edit',
        severity: 'medium',
        message: 'Files being edited repeatedly without resolution',
        files: frequentlyEdited
      });
      stuckPatterns.confidence += 25;
    }

    // Pattern 3: Test failures in recent runs
    const testResultsPath = path.join(process.cwd(), 'coverage', 'test-results.json');
    if (fs.existsSync(testResultsPath)) {
      try {
        const testResults = fs.readJsonSync(testResultsPath);
        if (testResults.numFailedTests > 0) {
          stuckPatterns.patterns.push({
            type: 'test-failure',
            severity: 'medium',
            message: `${testResults.numFailedTests} tests failing`,
            failedTests: testResults.testResults?.filter(t => t.status === 'failed').slice(0, 5)
          });
          stuckPatterns.confidence += 20;
        }
      } catch {
        // Cannot read test results
      }
    }

    // Pattern 4: Error log patterns
    const errorLogPath = path.join(process.cwd(), 'logs', 'error.log');
    if (fs.existsSync(errorLogPath)) {
      try {
        const errorLog = fs.readFileSync(errorLogPath, 'utf8');
        const recentErrors = errorLog.split('\n').slice(-50);
        const errorCounts = {};
        recentErrors.forEach(line => {
          const match = line.match(/Error: (.+)/);
          if (match) {
            const key = match[1].slice(0, 50);
            errorCounts[key] = (errorCounts[key] || 0) + 1;
          }
        });

        const repetitiveErrors = Object.entries(errorCounts)
          .filter(([, count]) => count >= 3)
          .map(([error, count]) => ({ error, count }));

        if (repetitiveErrors.length > 0) {
          stuckPatterns.patterns.push({
            type: 'repetitive-error',
            severity: 'high',
            message: 'Same errors occurring repeatedly',
            errors: repetitiveErrors
          });
          stuckPatterns.confidence += 30;
        }
      } catch {
        // Cannot read error log
      }
    }

    // Determine if stuck
    stuckPatterns.isStuck = stuckPatterns.confidence >= 50;

    // Generate suggestions based on patterns
    if (stuckPatterns.patterns.some(p => p.type === 'revert-cycle')) {
      stuckPatterns.suggestions.push('Consider stepping back to review the overall approach');
      stuckPatterns.suggestions.push('Break down the problem into smaller, testable pieces');
    }
    if (stuckPatterns.patterns.some(p => p.type === 'circular-edit')) {
      stuckPatterns.suggestions.push('Focus on one file at a time and verify changes work');
      stuckPatterns.suggestions.push('Run tests after each change to catch issues early');
    }
    if (stuckPatterns.patterns.some(p => p.type === 'test-failure')) {
      stuckPatterns.suggestions.push('Fix failing tests before making new changes');
      stuckPatterns.suggestions.push('Review test expectations vs implementation');
    }
    if (stuckPatterns.patterns.some(p => p.type === 'repetitive-error')) {
      stuckPatterns.suggestions.push('Address root cause of repetitive errors');
      stuckPatterns.suggestions.push('Consider using different approach if error persists');
    }

    // Display results
    if (stuckPatterns.isStuck) {
      console.log(chalk.bold.red('🚨 Stuck Pattern Detected!\n'));
    } else if (stuckPatterns.patterns.length > 0) {
      console.log(chalk.bold.yellow('⚠️ Potential Issues Found\n'));
    } else {
      console.log(chalk.bold.green('✓ No stuck patterns detected\n'));
      return stuckPatterns;
    }

    console.log(chalk.dim(`Confidence: ${stuckPatterns.confidence}%\n`));

    stuckPatterns.patterns.forEach(pattern => {
      const severityColor = {
        high: chalk.red,
        medium: chalk.yellow,
        low: chalk.blue
      }[pattern.severity] || chalk.white;

      console.log(severityColor(`[${pattern.severity.toUpperCase()}] ${pattern.type}`));
      console.log(chalk.dim(`  ${pattern.message}`));
      console.log();
    });

    if (stuckPatterns.suggestions.length > 0) {
      console.log(chalk.bold('Suggestions:'));
      stuckPatterns.suggestions.forEach(s => {
        console.log(chalk.cyan(`  → ${s}`));
      });
      console.log();
    }

    return stuckPatterns;
  } catch (error) {
    if (options.verbose) {
      log(`Stuck analysis error: ${error.message}`, 'error');
    }
    return stuckPatterns;
  }
}

// ============================================================================
// Main Function
// ============================================================================

async function main() {
  console.log(chalk.bold.cyan('\n🔍 MUSUBI Code Analysis\n'));

  const analysisData = {};

  try {
    // Handle --codegraph or --codegraph-full options
    if (options.codegraph || options.codegraphFull || options.type === 'codegraph') {
      analysisData.codegraph = await analyzeCodeGraph(options.codegraphFull);
      
      if (options.json && analysisData.codegraph) {
        console.log(JSON.stringify(analysisData.codegraph, null, 2));
      }
      
      if (options.type === 'codegraph') {
        log('CodeGraph analysis complete!', 'success');
        process.exit(0);
      }
    }

    // Handle --detect-stuck option
    if (options.detectStuck || options.type === 'stuck') {
      analysisData.stuck = await analyzeStuckPatterns();
      
      if (options.json) {
        console.log(JSON.stringify(analysisData.stuck, null, 2));
      }
      
      if (options.type === 'stuck') {
        process.exit(analysisData.stuck?.isStuck ? 1 : 0);
      }
    }

    if (options.type === 'quality' || options.type === 'all') {
      analysisData.quality = await analyzeQuality();
    }

    if (options.type === 'dependencies' || options.type === 'all') {
      analysisData.dependencies = await analyzeDependencies();
    }

    if (options.type === 'security' || options.type === 'all') {
      analysisData.security = await analyzeSecurity();
    }

    // Run CodeGraph analysis in 'all' mode if codegraph-mcp is available
    if (options.type === 'all' && isCodeGraphInstalled() && !analysisData.codegraph) {
      analysisData.codegraph = await analyzeCodeGraph(false);
    }

    // Generate report if output specified
    if (options.output || options.type === 'all') {
      await generateReport(analysisData);
    }

    // JSON output
    if (options.json) {
      console.log(JSON.stringify(analysisData, null, 2));
    }

    log('Analysis complete!', 'success');
  } catch (error) {
    log(`Analysis failed: ${error.message}`, 'error');
    if (options.verbose) {
      console.error(error);
    }
    process.exit(1);
  }
}

// ============================================================================
// Execute
// ============================================================================

main();
