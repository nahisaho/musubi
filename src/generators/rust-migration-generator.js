/**
 * MUSUBI Rust Migration Generator
 *
 * Analyzes C/C++ codebases and generates Rust migration plans:
 * - Unsafe pattern detection
 * - Security-critical component identification
 * - Rust replacement priority scoring
 * - Migration plan generation
 *
 * Based on GCC analysis: libssp, libbacktrace, libsanitizer, libvtv
 *
 * @version 5.5.0
 */

const fs = require('fs-extra');
const path = require('path');
const { glob } = require('glob');

// ============================================================================
// Unsafe Pattern Categories
// ============================================================================

const UNSAFE_PATTERNS = {
  memoryManagement: [
    { pattern: /\bmalloc\s*\(/g, risk: 'high', description: 'Manual memory allocation' },
    { pattern: /\bcalloc\s*\(/g, risk: 'high', description: 'Manual memory allocation' },
    { pattern: /\brealloc\s*\(/g, risk: 'high', description: 'Manual memory reallocation' },
    { pattern: /\bfree\s*\(/g, risk: 'medium', description: 'Manual memory deallocation (potential double-free)' },
    { pattern: /\bnew\s+\w+\s*\[/g, risk: 'medium', description: 'Array new (prefer std::vector)' },
    { pattern: /\bdelete\s*\[/g, risk: 'medium', description: 'Array delete' },
  ],
  bufferOverflow: [
    { pattern: /\bstrcpy\s*\(/g, risk: 'critical', description: 'Unbounded string copy' },
    { pattern: /\bstrcat\s*\(/g, risk: 'critical', description: 'Unbounded string concatenation' },
    { pattern: /\bsprintf\s*\(/g, risk: 'critical', description: 'Unbounded formatted output' },
    { pattern: /\bgets\s*\(/g, risk: 'critical', description: 'Unbounded input (deprecated)' },
    { pattern: /\bscanf\s*\([^,]*%s/g, risk: 'critical', description: 'Unbounded scanf string' },
    { pattern: /\bmemcpy\s*\(/g, risk: 'medium', description: 'Memory copy (needs size validation)' },
    { pattern: /\bmemmove\s*\(/g, risk: 'medium', description: 'Memory move (needs size validation)' },
  ],
  pointerOperations: [
    { pattern: /\*\s*\(\s*\w+\s*\+/g, risk: 'high', description: 'Pointer arithmetic' },
    { pattern: /\[\s*-?\d+\s*\]/g, risk: 'medium', description: 'Array indexing (potential out-of-bounds)' },
    { pattern: /reinterpret_cast/g, risk: 'high', description: 'Type-unsafe cast' },
    { pattern: /\(void\s*\*\)/g, risk: 'medium', description: 'Void pointer cast' },
    { pattern: /\*\*\w+/g, risk: 'medium', description: 'Double pointer' },
  ],
  concurrency: [
    { pattern: /\bpthread_/g, risk: 'medium', description: 'POSIX threads (consider Rust std::thread)' },
    { pattern: /\batomic_/g, risk: 'low', description: 'Atomic operations' },
    { pattern: /\bmutex/g, risk: 'low', description: 'Mutex usage' },
    { pattern: /\bvolatile\b/g, risk: 'medium', description: 'Volatile (often misused for concurrency)' },
  ],
  formatString: [
    { pattern: /\bprintf\s*\(\s*\w+/g, risk: 'high', description: 'Format string from variable' },
    { pattern: /\bfprintf\s*\([^,]+,\s*\w+/g, risk: 'high', description: 'Format string from variable' },
    { pattern: /\bsyslog\s*\([^,]+,\s*\w+/g, risk: 'high', description: 'Syslog format string vulnerability' },
  ],
  integerOverflow: [
    { pattern: /\+\+\w+\s*[<>=]/g, risk: 'low', description: 'Increment in comparison (potential overflow)' },
    { pattern: /<<\s*\d{2,}/g, risk: 'medium', description: 'Large bit shift' },
    { pattern: /\bunsigned\s+\w+\s*-/g, risk: 'medium', description: 'Unsigned subtraction (potential underflow)' },
  ],
};

// ============================================================================
// Security-Critical Component Patterns
// ============================================================================

const SECURITY_COMPONENTS = [
  { pattern: /ssp|stack.*smash|canary/i, component: 'Stack Protection', rustCrate: 'rust-ssp' },
  { pattern: /backtrace|stack.*trace|unwind/i, component: 'Backtrace', rustCrate: 'rust-backtrace' },
  { pattern: /sanitizer|asan|msan|tsan|ubsan/i, component: 'Sanitizers', rustCrate: 'rust-sanitizer' },
  { pattern: /vtv|vtable|virtual.*table/i, component: 'VTable Verification', rustCrate: 'rust-vtv' },
  { pattern: /crypt|encrypt|decrypt|cipher/i, component: 'Cryptography', rustCrate: 'ring or rustcrypto' },
  { pattern: /auth|login|password|credential/i, component: 'Authentication', rustCrate: 'argon2' },
  { pattern: /parse|lexer|tokenize/i, component: 'Parser', rustCrate: 'nom or pest' },
  { pattern: /network|socket|tcp|udp|http/i, component: 'Networking', rustCrate: 'tokio' },
];

// ============================================================================
// Rust Migration Generator
// ============================================================================

class RustMigrationGenerator {
  constructor(workspaceRoot, options = {}) {
    this.workspaceRoot = workspaceRoot;
    this.options = {
      excludePatterns: [
        'node_modules/**',
        'vendor/**',
        'third_party/**',
        '.git/**',
        'build/**',
        'test/**',
      ],
      ...options,
    };
  }

  /**
   * Analyze codebase for Rust migration candidates
   */
  async analyze() {
    const files = await this.findCppFiles();

    console.log(`📊 Analyzing ${files.length} C/C++ files for Rust migration...`);

    const analysis = {
      timestamp: new Date().toISOString(),
      totalFiles: files.length,
      fileAnalyses: [],
      unsafePatterns: [],
      securityComponents: [],
      priorities: [],
      summary: {},
    };

    for (const file of files) {
      const fileAnalysis = await this.analyzeFile(file);
      if (fileAnalysis) {
        analysis.fileAnalyses.push(fileAnalysis);
        analysis.unsafePatterns.push(...fileAnalysis.unsafePatterns);
      }
    }

    // Identify security-critical components
    analysis.securityComponents = this.identifySecurityComponents(analysis.fileAnalyses);

    // Calculate priorities
    analysis.priorities = this.calculatePriorities(analysis.fileAnalyses);

    // Generate summary
    analysis.summary = this.generateSummary(analysis);

    return analysis;
  }

  /**
   * Find all C/C++ files
   */
  async findCppFiles() {
    const patterns = ['**/*.c', '**/*.cpp', '**/*.cc', '**/*.h', '**/*.hpp'];
    let allFiles = [];

    for (const pattern of patterns) {
      const files = await glob(pattern, {
        cwd: this.workspaceRoot,
        ignore: this.options.excludePatterns,
        nodir: true,
        absolute: true,
      });
      allFiles = allFiles.concat(files);
    }

    return allFiles;
  }

  /**
   * Analyze a single file
   */
  async analyzeFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const relativePath = path.relative(this.workspaceRoot, filePath);
      const lines = content.split('\n').length;

      const analysis = {
        path: relativePath,
        absolutePath: filePath,
        lines,
        unsafePatterns: [],
        riskScore: 0,
        rustBenefit: 'low',
      };

      // Check for unsafe patterns
      for (const [category, patterns] of Object.entries(UNSAFE_PATTERNS)) {
        for (const { pattern, risk, description } of patterns) {
          const matches = content.match(pattern);
          if (matches && matches.length > 0) {
            analysis.unsafePatterns.push({
              category,
              pattern: pattern.source,
              risk,
              description,
              occurrences: matches.length,
              file: relativePath,
            });

            // Add to risk score
            const riskWeights = { critical: 10, high: 5, medium: 2, low: 1 };
            analysis.riskScore += (riskWeights[risk] || 1) * matches.length;
          }
        }
      }

      // Calculate Rust benefit
      if (analysis.riskScore >= 50) {
        analysis.rustBenefit = 'critical';
      } else if (analysis.riskScore >= 20) {
        analysis.rustBenefit = 'high';
      } else if (analysis.riskScore >= 10) {
        analysis.rustBenefit = 'medium';
      } else if (analysis.riskScore > 0) {
        analysis.rustBenefit = 'low';
      } else {
        analysis.rustBenefit = 'minimal';
      }

      return analysis;
    } catch (error) {
      return null;
    }
  }

  /**
   * Identify security-critical components
   */
  identifySecurityComponents(fileAnalyses) {
    const components = [];

    for (const analysis of fileAnalyses) {
      for (const { pattern, component, rustCrate } of SECURITY_COMPONENTS) {
        if (pattern.test(analysis.path)) {
          const existing = components.find(c => c.component === component);
          if (existing) {
            existing.files.push(analysis.path);
            existing.totalRiskScore += analysis.riskScore;
          } else {
            components.push({
              component,
              rustCrate,
              files: [analysis.path],
              totalRiskScore: analysis.riskScore,
              priority: analysis.riskScore >= 20 ? 'high' : 'medium',
            });
          }
        }
      }
    }

    return components.sort((a, b) => b.totalRiskScore - a.totalRiskScore);
  }

  /**
   * Calculate migration priorities
   */
  calculatePriorities(fileAnalyses) {
    return fileAnalyses
      .filter(f => f.riskScore > 0)
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 50)
      .map((f, index) => ({
        rank: index + 1,
        file: f.path,
        riskScore: f.riskScore,
        rustBenefit: f.rustBenefit,
        unsafePatternCount: f.unsafePatterns.length,
        topIssues: f.unsafePatterns
          .sort((a, b) => {
            const weights = { critical: 4, high: 3, medium: 2, low: 1 };
            return weights[b.risk] - weights[a.risk];
          })
          .slice(0, 3)
          .map(p => `${p.category}: ${p.description}`),
      }));
  }

  /**
   * Generate summary
   */
  generateSummary(analysis) {
    const riskDistribution = { critical: 0, high: 0, medium: 0, low: 0, minimal: 0 };

    for (const file of analysis.fileAnalyses) {
      riskDistribution[file.rustBenefit]++;
    }

    const patternDistribution = {};
    for (const pattern of analysis.unsafePatterns) {
      patternDistribution[pattern.category] = (patternDistribution[pattern.category] || 0) + pattern.occurrences;
    }

    return {
      totalFiles: analysis.totalFiles,
      filesWithIssues: analysis.fileAnalyses.filter(f => f.riskScore > 0).length,
      totalUnsafePatterns: analysis.unsafePatterns.reduce((sum, p) => sum + p.occurrences, 0),
      riskDistribution,
      patternDistribution,
      securityComponentsFound: analysis.securityComponents.length,
      estimatedMigrationEffort: this.estimateMigrationEffort(analysis),
    };
  }

  /**
   * Estimate migration effort
   */
  estimateMigrationEffort(analysis) {
    const highPriorityFiles = analysis.priorities.filter(p => p.rustBenefit === 'critical' || p.rustBenefit === 'high').length;
    const totalLines = analysis.fileAnalyses.reduce((sum, f) => sum + f.lines, 0);

    // Rough estimation: 1 day per 500 lines for high-risk files
    const days = Math.ceil(totalLines / 500);

    return {
      estimatedDays: days,
      highPriorityFiles,
      recommendation: highPriorityFiles > 10
        ? 'Consider phased migration starting with security-critical components'
        : 'Direct migration feasible',
    };
  }

  /**
   * Generate migration plan
   */
  async generateMigrationPlan(analysis) {
    const plan = {
      title: 'Rust Migration Plan',
      generatedAt: new Date().toISOString(),
      phases: [],
    };

    // Phase 1: Security-critical components
    if (analysis.securityComponents.length > 0) {
      plan.phases.push({
        phase: 1,
        name: 'Security-Critical Components',
        description: 'Migrate security-sensitive code first for immediate safety improvements',
        components: analysis.securityComponents.map(c => ({
          component: c.component,
          suggestedCrate: c.rustCrate,
          files: c.files.slice(0, 10),
          priority: c.priority,
        })),
        estimatedEffort: '2-4 weeks',
      });
    }

    // Phase 2: High-risk files
    const highRisk = analysis.priorities.filter(p => p.rustBenefit === 'critical');
    if (highRisk.length > 0) {
      plan.phases.push({
        phase: 2,
        name: 'High-Risk File Migration',
        description: 'Migrate files with critical unsafe patterns',
        files: highRisk.slice(0, 20).map(f => ({
          file: f.file,
          riskScore: f.riskScore,
          topIssues: f.topIssues,
        })),
        estimatedEffort: '4-8 weeks',
      });
    }

    // Phase 3: Medium-risk files
    const mediumRisk = analysis.priorities.filter(p => p.rustBenefit === 'high' || p.rustBenefit === 'medium');
    if (mediumRisk.length > 0) {
      plan.phases.push({
        phase: 3,
        name: 'Medium-Risk File Migration',
        description: 'Migrate remaining files with notable unsafe patterns',
        fileCount: mediumRisk.length,
        estimatedEffort: '8-16 weeks',
      });
    }

    // Phase 4: Integration and testing
    plan.phases.push({
      phase: plan.phases.length + 1,
      name: 'Integration and Testing',
      description: 'Integrate Rust components with existing codebase via FFI',
      tasks: [
        'Create FFI bindings between Rust and C/C++',
        'Write comprehensive test suites',
        'Performance benchmarking',
        'Gradual rollout with feature flags',
      ],
      estimatedEffort: '2-4 weeks',
    });

    return plan;
  }

  /**
   * Generate markdown report
   */
  generateReport(analysis) {
    let report = '# Rust Migration Analysis Report\n\n';
    report += `**Generated**: ${analysis.timestamp}\n`;
    report += `**Repository**: ${this.workspaceRoot}\n\n`;

    report += '## Executive Summary\n\n';
    report += `- **Total C/C++ Files**: ${analysis.summary.totalFiles.toLocaleString()}\n`;
    report += `- **Files with Issues**: ${analysis.summary.filesWithIssues.toLocaleString()}\n`;
    report += `- **Total Unsafe Patterns**: ${analysis.summary.totalUnsafePatterns.toLocaleString()}\n`;
    report += `- **Security Components Found**: ${analysis.summary.securityComponentsFound}\n`;
    report += `- **Estimated Migration Effort**: ${analysis.summary.estimatedMigrationEffort.estimatedDays} days\n\n`;

    report += '## Risk Distribution\n\n';
    report += '| Risk Level | File Count |\n|------------|------------|\n';
    for (const [level, count] of Object.entries(analysis.summary.riskDistribution)) {
      report += `| ${level} | ${count} |\n`;
    }
    report += '\n';

    report += '## Unsafe Pattern Distribution\n\n';
    report += '| Category | Occurrences |\n|----------|-------------|\n';
    for (const [category, count] of Object.entries(analysis.summary.patternDistribution)) {
      report += `| ${category} | ${count} |\n`;
    }
    report += '\n';

    if (analysis.securityComponents.length > 0) {
      report += '## Security-Critical Components\n\n';
      report += '| Component | Suggested Rust Crate | Files | Risk Score |\n|-----------|---------------------|-------|------------|\n';
      for (const comp of analysis.securityComponents) {
        report += `| ${comp.component} | ${comp.rustCrate} | ${comp.files.length} | ${comp.totalRiskScore} |\n`;
      }
      report += '\n';
    }

    report += '## Top 20 Migration Priorities\n\n';
    report += '| Rank | File | Risk Score | Rust Benefit | Top Issues |\n|------|------|------------|--------------|------------|\n';
    for (const p of analysis.priorities.slice(0, 20)) {
      const issues = p.topIssues.join('; ').substring(0, 50);
      report += `| ${p.rank} | ${p.file} | ${p.riskScore} | ${p.rustBenefit} | ${issues}... |\n`;
    }
    report += '\n';

    report += '## Recommendations\n\n';
    report += '1. **Start with Security Components**: Migrate stack protection, sanitizers, and authentication code first\n';
    report += '2. **Use Safe Abstractions**: Replace raw pointers with Rust references, Box, Rc, or Arc\n';
    report += '3. **Leverage Rust Libraries**: Use well-tested crates like `ring` for crypto, `tokio` for async\n';
    report += '4. **FFI Bridge**: Create a clean C-compatible interface between Rust and existing C++ code\n';
    report += '5. **Incremental Migration**: Migrate one component at a time with thorough testing\n';

    return report;
  }
}

module.exports = { RustMigrationGenerator, UNSAFE_PATTERNS, SECURITY_COMPONENTS };
