#!/usr/bin/env node

/**
 * MUSUBI Analyze - Intelligent Code Quality Analysis
 *
 * Analyzes codebase for:
 * - Code quality metrics (complexity, maintainability)
 * - Technical debt detection
 * - Dependency analysis
 * - Security vulnerabilities
 *
 * @version 0.5.0
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const { program } = require('commander');
const { glob } = require('glob');

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
  .version('0.5.0')
  .option('-t, --type <type>', 'Analysis type: quality, dependencies, security, all', 'all')
  .option('-o, --output <file>', 'Output file for analysis report')
  .option('--json', 'Output in JSON format')
  .option('--threshold <level>', 'Quality threshold: low, medium, high', 'medium')
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
// Main Function
// ============================================================================

async function main() {
  console.log(chalk.bold.cyan('\n🔍 MUSUBI Code Analysis\n'));

  const analysisData = {};

  try {
    if (options.type === 'quality' || options.type === 'all') {
      analysisData.quality = await analyzeQuality();
    }

    if (options.type === 'dependencies' || options.type === 'all') {
      analysisData.dependencies = await analyzeDependencies();
    }

    if (options.type === 'security' || options.type === 'all') {
      analysisData.security = await analyzeSecurity();
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
