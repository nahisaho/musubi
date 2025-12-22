#!/usr/bin/env node

/**
 * Constitutional Validator
 *
 * Validates compliance with the 9 Constitutional Articles.
 * Part of MUSUBI SDD governance system.
 *
 * v2.0: Supports Constitution levels (critical/advisory/flexible)
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const {
  ConstitutionLevelManager,
  ArticleId,
  EnforcementLevel: _EnforcementLevel,
} = require('./constitution-level-manager');

class ConstitutionalValidator {
  constructor(projectRoot, options = {}) {
    this.projectRoot = projectRoot;
    this.violations = [];
    this.warnings = [];
    this.passes = [];
    this.options = {
      mode: options.mode || 'medium',
      packageType: options.packageType || 'application',
      strict: options.strict || false,
      ...options,
    };
    this.levelManager = new ConstitutionLevelManager(projectRoot);
    this._levelCache = {};
  }

  /**
   * Run all constitutional validations
   */
  async validateAll() {
    console.log('🏛️  Constitutional Validation Starting...\n');

    // Load level configuration
    await this._loadLevelConfig();

    await this.validateArticleI(); // Library-First
    await this.validateArticleII(); // CLI Interface
    await this.validateArticleIII(); // Test-First
    await this.validateArticleIV(); // EARS Format
    await this.validateArticleV(); // Traceability
    await this.validateArticleVI(); // Project Memory
    await this.validateArticleVII(); // Simplicity Gate
    await this.validateArticleVIII(); // Anti-Abstraction
    await this.validateArticleIX(); // Integration-First

    return this.generateReport();
  }

  /**
   * Load level configuration for context
   * @private
   */
  async _loadLevelConfig() {
    const context = {
      mode: this.options.mode,
      packageType: this.options.packageType,
    };

    for (const articleId of Object.values(ArticleId)) {
      this._levelCache[articleId] = {
        level: await this.levelManager.getArticleLevel(articleId),
        enforcement: await this.levelManager.getEnforcementType(articleId),
        isBlocking: await this.levelManager.isBlocking(articleId),
      };
    }

    // Load configurable values
    this._levelCache.coverageThreshold = await this.levelManager.getCoverageThreshold(context);
    this._levelCache.mockAllowed = await this.levelManager.isMockAllowed(null, context);
    this._levelCache.earsRequired = await this.levelManager.isEarsRequired(context);
    this._levelCache.adrRequired = await this.levelManager.isAdrRequired(context);
  }

  /**
   * Record a finding based on article level
   * @param {string} articleId - Article ID (e.g., 'CONST-001')
   * @param {string} articleName - Display name for the article
   * @param {boolean} passed - Whether the check passed
   * @param {string} message - Finding message
   * @param {string} recommendation - Recommendation for fixing
   * @private
   */
  _recordFinding(articleId, articleName, passed, message, recommendation) {
    const levelInfo = this._levelCache[articleId] || { level: 'advisory', isBlocking: false };

    if (passed) {
      this.passes.push({
        article: articleName,
        articleId,
        level: levelInfo.level,
        message,
      });
      return;
    }

    // Determine severity based on level
    if (levelInfo.isBlocking || this.options.strict) {
      this.violations.push({
        article: articleName,
        articleId,
        level: levelInfo.level,
        message,
        severity: levelInfo.level === 'critical' ? 'critical' : 'high',
        blocking: levelInfo.isBlocking,
        recommendation,
      });
    } else {
      this.warnings.push({
        article: articleName,
        articleId,
        level: levelInfo.level,
        message,
        recommendation,
      });
    }
  }

  /**
   * Article I: Library-First Principle (CRITICAL)
   */
  async validateArticleI() {
    const articleId = ArticleId.LIBRARY_FIRST;
    const articleName = 'Article I: Library-First';

    // Check for lib/ or packages/ directory
    const libDirs = ['lib', 'packages', 'libs', 'src'].filter(dir =>
      fs.existsSync(path.join(this.projectRoot, dir))
    );

    if (libDirs.length === 0) {
      this._recordFinding(
        articleId,
        articleName,
        false,
        'No library directory found (lib/, packages/, libs/, src/)',
        'Create a lib/ directory for reusable components'
      );
    } else {
      this._recordFinding(
        articleId,
        articleName,
        true,
        `Library directory found: ${libDirs.join(', ')}`,
        null
      );
    }

    // Check if features have test suites
    const libPath = path.join(this.projectRoot, libDirs[0] || 'lib');
    if (fs.existsSync(libPath)) {
      const subDirs = fs
        .readdirSync(libPath)
        .filter(f => fs.statSync(path.join(libPath, f)).isDirectory());

      for (const lib of subDirs) {
        // Check multiple possible test directory names
        const testDirs = ['tests', 'test', '__tests__'];
        const hasTestDir = testDirs.some(dir => fs.existsSync(path.join(libPath, lib, dir)));

        // Check for test files in the library root or test subdirectories
        const testFile = glob.sync(path.join(libPath, lib, '**/*.test.{js,ts}'));
        const specFile = glob.sync(path.join(libPath, lib, '**/*.spec.{js,ts}'));

        if (!hasTestDir && testFile.length === 0 && specFile.length === 0) {
          this._recordFinding(
            articleId,
            articleName,
            false,
            `Library '${lib}' has no test suite`,
            `Add tests to ${libPath}/${lib}/`
          );
        }
      }
    }
  }

  /**
   * Article II: CLI Interface Mandate (ADVISORY)
   */
  async validateArticleII() {
    const articleId = ArticleId.CLI_INTERFACE;
    const articleName = 'Article II: CLI Interface';

    // Check for bin/ directory
    const binPath = path.join(this.projectRoot, 'bin');
    const packageJson = this.readPackageJson();

    if (fs.existsSync(binPath)) {
      const cliFiles = fs.readdirSync(binPath);
      this._recordFinding(
        articleId,
        articleName,
        true,
        `CLI interfaces found in bin/: ${cliFiles.length} file(s)`,
        null
      );
    } else if (packageJson?.bin) {
      this._recordFinding(
        articleId,
        articleName,
        true,
        `CLI entry points defined in package.json`,
        null
      );
    } else {
      this._recordFinding(
        articleId,
        articleName,
        false,
        'No CLI interface found',
        'Add bin/ directory or define "bin" in package.json'
      );
    }
  }

  /**
   * Article III: Test-First Imperative (CRITICAL)
   */
  async validateArticleIII() {
    const articleId = ArticleId.TEST_FIRST;
    const articleName = 'Article III: Test-First';

    // Check for test directory
    const testDirs = ['tests', 'test', '__tests__', 'spec'].filter(dir =>
      fs.existsSync(path.join(this.projectRoot, dir))
    );

    if (testDirs.length === 0) {
      this._recordFinding(
        articleId,
        articleName,
        false,
        'No test directory found',
        'Create tests/ directory with test files'
      );
      return;
    }

    // Check test coverage configuration
    const jestConfig = fs.existsSync(path.join(this.projectRoot, 'jest.config.js'));
    const coverageDir = fs.existsSync(path.join(this.projectRoot, 'coverage'));
    const coverageThreshold = this._levelCache.coverageThreshold || 80;

    if (!jestConfig && !coverageDir) {
      this._recordFinding(
        articleId,
        articleName,
        false,
        'No test coverage configuration found',
        `Configure test coverage (${coverageThreshold}% threshold required)`
      );
    } else {
      this._recordFinding(
        articleId,
        articleName,
        true,
        `Test infrastructure found: ${testDirs.join(', ')}`,
        null
      );
    }
  }

  /**
   * Article IV: EARS Requirements Format (ADVISORY)
   */
  async validateArticleIV() {
    const articleId = ArticleId.EARS_FORMAT;
    const articleName = 'Article IV: EARS Format';
    const earsRequired = this._levelCache.earsRequired;

    // Skip if EARS not required in this mode
    if (!earsRequired && this.options.mode === 'small') {
      this._recordFinding(
        articleId,
        articleName,
        true,
        'EARS format not required in small mode',
        null
      );
      return;
    }

    // Find requirements files
    const reqFiles = glob.sync(path.join(this.projectRoot, '**/*requirements*.md'), {
      ignore: ['**/node_modules/**', '**/templates/**'],
    });

    if (reqFiles.length === 0) {
      this._recordFinding(
        articleId,
        articleName,
        false,
        'No requirements files found',
        'Create requirements using EARS format'
      );
      return;
    }

    for (const file of reqFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const hasEARS = /\b(WHEN|WHILE|IF|WHERE|SHALL)\b/g.test(content);
      const hasAmbiguous = /\b(should|may|might|could)\b/gi.test(content);

      if (!hasEARS) {
        this._recordFinding(
          articleId,
          articleName,
          false,
          `${path.basename(file)} not in EARS format`,
          'Use EARS patterns: WHEN/WHILE/IF/WHERE + SHALL'
        );
      } else if (hasAmbiguous) {
        this._recordFinding(
          articleId,
          articleName,
          false,
          `${path.basename(file)} contains ambiguous keywords`,
          'Replace should/may with SHALL/MUST'
        );
      } else {
        this._recordFinding(
          articleId,
          articleName,
          true,
          `${path.basename(file)} uses EARS format`,
          null
        );
      }
    }
  }

  /**
   * Article V: Traceability Mandate (CRITICAL)
   */
  async validateArticleV() {
    const articleId = ArticleId.TRACEABILITY;
    const articleName = 'Article V: Traceability';

    // Check for traceability matrix
    const traceFiles = glob.sync(path.join(this.projectRoot, '**/*{trace,coverage-matrix}*.md'), {
      ignore: ['**/node_modules/**'],
    });

    if (traceFiles.length === 0) {
      this._recordFinding(
        articleId,
        articleName,
        false,
        'No traceability matrix found',
        'Create coverage-matrix.md linking REQ → Design → Test'
      );
    } else {
      this._recordFinding(
        articleId,
        articleName,
        true,
        `Traceability files found: ${traceFiles.length}`,
        null
      );
    }

    // Check for REQ-XXX patterns in test files
    const testFiles = glob.sync(path.join(this.projectRoot, '**/*.test.{js,ts}'), {
      ignore: ['**/node_modules/**'],
    });

    let testsWithReqs = 0;
    for (const file of testFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      if (/REQ-\w+-\d+/g.test(content)) {
        testsWithReqs++;
      }
    }

    if (testFiles.length > 0 && testsWithReqs === 0) {
      this._recordFinding(
        articleId,
        articleName,
        false,
        'Test files do not reference requirement IDs',
        'Add REQ-XXX-NNN references to test descriptions'
      );
    }
  }

  /**
   * Article VI: Project Memory (Steering) (ADVISORY)
   */
  async validateArticleVI() {
    const articleId = ArticleId.CONSTITUTION_ENFORCEMENT;
    const articleName = 'Article VI: Project Memory';

    const steeringPath = path.join(this.projectRoot, 'steering');
    const requiredFiles = ['structure.md', 'tech.md', 'product.md'];

    if (!fs.existsSync(steeringPath)) {
      this._recordFinding(
        articleId,
        articleName,
        false,
        'No steering/ directory found',
        'Run "musubi init" to create steering files'
      );
      return;
    }

    for (const file of requiredFiles) {
      const filePath = path.join(steeringPath, file);
      if (!fs.existsSync(filePath)) {
        this._recordFinding(
          articleId,
          articleName,
          false,
          `Missing steering file: ${file}`,
          `Create steering/${file}`
        );
      } else {
        this._recordFinding(articleId, articleName, true, `Found steering/${file}`, null);
      }
    }
  }

  /**
   * Article VII: Simplicity Gate (FLEXIBLE)
   */
  async validateArticleVII() {
    const articleId = ArticleId.DOCUMENTATION;
    const articleName = 'Article VII: Simplicity Gate';

    // Count top-level directories that look like projects
    const projectIndicators = ['package.json', 'Cargo.toml', 'pyproject.toml', 'go.mod'];
    let projectCount = 0;

    // Check root
    for (const indicator of projectIndicators) {
      if (fs.existsSync(path.join(this.projectRoot, indicator))) {
        projectCount++;
        break;
      }
    }

    // Check packages/
    const packagesPath = path.join(this.projectRoot, 'packages');
    if (fs.existsSync(packagesPath)) {
      const subProjects = fs.readdirSync(packagesPath).filter(f => {
        const subPath = path.join(packagesPath, f);
        if (!fs.statSync(subPath).isDirectory()) return false;
        return projectIndicators.some(ind => fs.existsSync(path.join(subPath, ind)));
      });
      projectCount += subProjects.length;
    }

    if (projectCount > 3) {
      const complexityPath = path.join(this.projectRoot, 'steering/complexity-tracking.md');
      if (!fs.existsSync(complexityPath)) {
        this._recordFinding(
          articleId,
          articleName,
          false,
          `${projectCount} projects detected (> 3 limit)`,
          'Document justification in steering/complexity-tracking.md'
        );
      } else {
        this._recordFinding(
          articleId,
          articleName,
          true,
          `${projectCount} projects (complexity justified)`,
          null
        );
      }
    } else {
      this._recordFinding(
        articleId,
        articleName,
        true,
        `${projectCount} project(s) - within limit`,
        null
      );
    }
  }

  /**
   * Article VIII: Anti-Abstraction Gate (FLEXIBLE)
   */
  async validateArticleVIII() {
    const articleId = ArticleId.CODE_QUALITY;
    const articleName = 'Article VIII: Anti-Abstraction';

    // Check for common wrapper patterns
    const wrapperPatterns = [
      '**/BaseRepository.{js,ts}',
      '**/BaseService.{js,ts}',
      '**/AbstractFactory.{js,ts}',
      '**/wrapper/*.{js,ts}',
      '**/adapters/*.{js,ts}',
    ];

    const potentialWrappers = [];
    for (const pattern of wrapperPatterns) {
      const matches = glob.sync(path.join(this.projectRoot, pattern), {
        ignore: ['**/node_modules/**', '**/templates/**'],
      });
      potentialWrappers.push(...matches);
    }

    if (potentialWrappers.length > 0) {
      this._recordFinding(
        articleId,
        articleName,
        false,
        `Potential wrapper abstractions detected: ${potentialWrappers.length} file(s)`,
        'Verify abstractions are justified per Phase -1 Gate'
      );
    } else {
      this._recordFinding(
        articleId,
        articleName,
        true,
        'No unnecessary abstraction layers detected',
        null
      );
    }
  }

  /**
   * Article IX: Integration-First Testing (ADVISORY)
   * Now supports mock exceptions for LLM providers and external APIs
   */
  async validateArticleIX() {
    const articleId = ArticleId.REAL_SERVICE_TESTING;
    const articleName = 'Article IX: Integration-First';

    // Check for docker-compose for test infrastructure
    const hasDockerCompose =
      fs.existsSync(path.join(this.projectRoot, 'docker-compose.yml')) ||
      fs.existsSync(path.join(this.projectRoot, 'docker-compose.test.yml'));

    // Check for mock usage
    const testFiles = glob.sync(path.join(this.projectRoot, '**/*.test.{js,ts}'), {
      ignore: ['**/node_modules/**'],
    });

    let mockCount = 0;
    let allowedMocks = 0;
    const allowedMockPatterns = ['llm', 'openai', 'anthropic', 'github', 'azure', 'api'];

    for (const file of testFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const mockMatches =
        content.match(/\b(jest\.mock|sinon\.stub|vi\.mock|mock\()\s*\(['"]([^'"]+)['"]\)/g) || [];

      for (const match of mockMatches) {
        const isAllowed = allowedMockPatterns.some(pattern =>
          match.toLowerCase().includes(pattern)
        );
        if (isAllowed) {
          allowedMocks++;
        } else {
          mockCount++;
        }
      }
    }

    if (!hasDockerCompose && testFiles.length > 0) {
      this._recordFinding(
        articleId,
        articleName,
        false,
        'No docker-compose for test infrastructure',
        'Add docker-compose.yml for real service testing'
      );
    } else if (hasDockerCompose) {
      this._recordFinding(
        articleId,
        articleName,
        true,
        'Docker Compose available for integration tests',
        null
      );
    }

    // Check mock usage, but allow exceptions
    const mockThreshold = this._levelCache.mockAllowed ? 20 : 10;
    if (mockCount > mockThreshold) {
      this._recordFinding(
        articleId,
        articleName,
        false,
        `High mock usage detected (${mockCount} mocks, ${allowedMocks} allowed exceptions)`,
        'Prefer real services; document mock justifications'
      );
    } else if (allowedMocks > 0) {
      this._recordFinding(
        articleId,
        articleName,
        true,
        `${mockCount} mocks (${allowedMocks} allowed for LLM/external APIs)`,
        null
      );
    }
  }

  /**
   * Utility: Read package.json
   */
  readPackageJson() {
    const pkgPath = path.join(this.projectRoot, 'package.json');
    if (fs.existsSync(pkgPath)) {
      return JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    }
    return null;
  }

  /**
   * Generate validation report
   */
  generateReport() {
    const criticalViolations = this.violations.filter(v => v.blocking);
    const nonBlockingViolations = this.violations.filter(v => !v.blocking);

    const report = {
      timestamp: new Date().toISOString(),
      projectRoot: this.projectRoot,
      options: this.options,
      summary: {
        passes: this.passes.length,
        warnings: this.warnings.length,
        violations: this.violations.length,
        criticalViolations: criticalViolations.length,
        status: criticalViolations.length === 0 ? 'COMPLIANT' : 'NON-COMPLIANT',
        mode: this.options.mode,
        packageType: this.options.packageType,
      },
      passes: this.passes,
      warnings: this.warnings,
      violations: this.violations,
      levels: {
        critical: criticalViolations,
        advisory: nonBlockingViolations,
        flexible: this.warnings.filter(w => w.level === 'flexible'),
      },
    };

    console.log('\n' + '='.repeat(60));
    console.log('📜 CONSTITUTIONAL VALIDATION REPORT');
    console.log('='.repeat(60));
    console.log(`Mode: ${this.options.mode} | Package: ${this.options.packageType}`);
    console.log(`Status: ${report.summary.status}`);
    console.log(
      `Passes: ${report.summary.passes} | Warnings: ${report.summary.warnings} | Violations: ${report.summary.violations}`
    );
    console.log(
      `Critical: ${criticalViolations.length} | Advisory: ${nonBlockingViolations.length}`
    );

    if (criticalViolations.length > 0) {
      console.log('\n🚫 CRITICAL VIOLATIONS (blocking):');
      criticalViolations.forEach(v => {
        console.log(`  [${v.level.toUpperCase()}] ${v.article}: ${v.message}`);
        console.log(`           → ${v.recommendation}`);
      });
    }

    if (nonBlockingViolations.length > 0) {
      console.log('\n❌ ADVISORY VIOLATIONS (non-blocking):');
      nonBlockingViolations.forEach(v => {
        console.log(`  [${v.level.toUpperCase()}] ${v.article}: ${v.message}`);
        console.log(`           → ${v.recommendation}`);
      });
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      this.warnings.forEach(w => {
        console.log(`  [${(w.level || 'advisory').toUpperCase()}] ${w.article}: ${w.message}`);
        console.log(`           → ${w.recommendation}`);
      });
    }

    console.log('\n✅ PASSES: ' + this.passes.length);
    console.log('='.repeat(60));

    return report;
  }
}

// CLI execution
if (require.main === module) {
  const projectRoot = process.argv[2] || process.cwd();
  const mode = process.argv[3] || 'medium';
  const packageType = process.argv[4] || 'application';
  const strict = process.argv.includes('--strict');

  const validator = new ConstitutionalValidator(projectRoot, {
    mode,
    packageType,
    strict,
  });

  validator
    .validateAll()
    .then(report => {
      // In strict mode, any violation is an error
      // Otherwise, only critical violations cause exit code 1
      const exitCode = report.summary.criticalViolations > 0 ? 1 : 0;
      process.exit(exitCode);
    })
    .catch(err => {
      console.error('Validation error:', err);
      process.exit(1);
    });
}

module.exports = { ConstitutionalValidator };
