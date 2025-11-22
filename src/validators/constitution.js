/**
 * Constitutional Governance Validator
 * 
 * Validates project compliance with 9 Constitutional Articles:
 * 
 * Article I: Library-First Principle
 * Article II: CLI Interface Mandate
 * Article III: Test-First Imperative
 * Article IV: EARS Requirements Format
 * Article V: Traceability Mandate
 * Article VI: Project Memory (Steering System)
 * Article VII: Simplicity Gate (≤3 sub-projects)
 * Article VIII: Anti-Abstraction Gate
 * Article IX: Integration-First Testing
 */

const fs = require('fs-extra');
const path = require('path');
const { glob } = require('glob');

class ConstitutionValidator {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.steeringPath = path.join(projectRoot, 'steering');
    this.constitutionPath = path.join(this.steeringPath, 'rules', 'constitution.md');
  }

  /**
   * Validate all 9 Constitutional Articles
   */
  async validateAll() {
    const results = {
      passed: true,
      violations: [],
      warnings: [],
      details: [],
      articles: {}
    };

    for (let i = 1; i <= 9; i++) {
      const articleResult = await this.validateArticle(i);
      results.articles[i] = articleResult;
      
      if (!articleResult.passed) {
        results.passed = false;
        results.violations.push(...articleResult.violations);
      }
      
      results.warnings.push(...(articleResult.warnings || []));
      results.details.push({
        article: i,
        passed: articleResult.passed,
        message: articleResult.summary
      });
    }

    results.summary = `${Object.values(results.articles).filter(a => a.passed).length}/9 Articles validated successfully`;
    
    return results;
  }

  /**
   * Validate specific Constitutional Article
   */
  async validateArticle(articleNumber) {
    const validators = {
      1: this.validateArticle1.bind(this), // Library-First
      2: this.validateArticle2.bind(this), // CLI Interface
      3: this.validateArticle3.bind(this), // Test-First
      4: this.validateArticle4.bind(this), // EARS Format
      5: this.validateArticle5.bind(this), // Traceability
      6: this.validateArticle6.bind(this), // Project Memory
      7: this.validateArticle7.bind(this), // Simplicity Gate
      8: this.validateArticle8.bind(this), // Anti-Abstraction
      9: this.validateArticle9.bind(this)  // Integration Testing
    };

    const validator = validators[articleNumber];
    if (!validator) {
      throw new Error(`Invalid article number: ${articleNumber}`);
    }

    return await validator();
  }

  /**
   * Article I: Library-First Principle
   */
  async validateArticle1() {
    const result = {
      article: 1,
      name: 'Library-First Principle',
      passed: true,
      violations: [],
      warnings: [],
      summary: ''
    };

    // Check for lib/ directory
    const libPath = path.join(this.projectRoot, 'lib');
    const srcPath = path.join(this.projectRoot, 'src');
    
    if (await fs.pathExists(libPath)) {
      result.warnings.push('Article I: lib/ directory found - verify libraries are independent');
    } else if (await fs.pathExists(srcPath)) {
      result.warnings.push('Article I: src/ directory found - consider separating libraries to lib/');
    }

    result.summary = 'Article I: Library-First Principle - Manual review recommended';
    return result;
  }

  /**
   * Article II: CLI Interface Mandate
   */
  async validateArticle2() {
    const result = {
      article: 2,
      name: 'CLI Interface Mandate',
      passed: true,
      violations: [],
      warnings: [],
      summary: ''
    };

    // Check for bin/ directory or package.json bin entries
    const binPath = path.join(this.projectRoot, 'bin');
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    
    if (await fs.pathExists(binPath)) {
      const binFiles = await fs.readdir(binPath);
      result.warnings.push(`Article II: ${binFiles.length} CLI scripts found in bin/`);
    }
    
    if (await fs.pathExists(packageJsonPath)) {
      const packageJson = await fs.readJson(packageJsonPath);
      if (packageJson.bin) {
        const binCount = Object.keys(packageJson.bin).length;
        result.warnings.push(`Article II: ${binCount} CLI commands defined in package.json`);
      }
    }

    result.summary = 'Article II: CLI Interface Mandate - CLI structure detected';
    return result;
  }

  /**
   * Article III: Test-First Imperative
   */
  async validateArticle3() {
    const result = {
      article: 3,
      name: 'Test-First Imperative',
      passed: true,
      violations: [],
      warnings: [],
      summary: ''
    };

    // Check for test files
    const testPatterns = [
      'test/**/*.js',
      'tests/**/*.js',
      'src/**/*.test.js',
      'src/**/*.spec.js',
      '__tests__/**/*.js'
    ];

    let testFileCount = 0;
    for (const pattern of testPatterns) {
      const files = await glob(pattern, { cwd: this.projectRoot });
      testFileCount += files.length;
    }

    if (testFileCount === 0) {
      result.passed = false;
      result.violations.push('Article III: No test files found - Test-First Imperative violated');
    } else {
      result.warnings.push(`Article III: ${testFileCount} test files found - verify Red-Green-Blue cycle in git history`);
    }

    // Check for test coverage configuration
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    if (await fs.pathExists(packageJsonPath)) {
      const packageJson = await fs.readJson(packageJsonPath);
      if (packageJson.jest && packageJson.jest.coverageThreshold) {
        result.warnings.push('Article III: Test coverage thresholds configured');
      } else {
        result.warnings.push('Article III: No coverage thresholds - consider adding 80% minimum');
      }
    }

    result.summary = testFileCount > 0 
      ? `Article III: ${testFileCount} test files found`
      : 'Article III: No tests found - VIOLATION';
    
    return result;
  }

  /**
   * Article IV: EARS Requirements Format
   */
  async validateArticle4() {
    const result = {
      article: 4,
      name: 'EARS Requirements Format',
      passed: true,
      violations: [],
      warnings: [],
      summary: ''
    };

    // Check for requirements files
    const reqPaths = [
      path.join(this.steeringPath, 'requirements.md'),
      path.join(this.projectRoot, 'docs', 'requirements.md'),
      path.join(this.projectRoot, 'specs', 'requirements.md')
    ];

    let requirementsFound = false;
    for (const reqPath of reqPaths) {
      if (await fs.pathExists(reqPath)) {
        requirementsFound = true;
        const content = await fs.readFile(reqPath, 'utf-8');
        
        // Check for EARS patterns
        const earsPatterns = [
          /WHEN\s+.*,?\s+the\s+.*\s+SHALL/i,
          /WHILE\s+.*,?\s+the\s+.*\s+SHALL/i,
          /IF\s+.*,?\s+THEN\s+the\s+.*\s+SHALL/i,
          /WHERE\s+.*,?\s+the\s+.*\s+SHALL/i,
          /The\s+.*\s+SHALL/i
        ];
        
        const hasEarsFormat = earsPatterns.some(pattern => pattern.test(content));
        
        if (hasEarsFormat) {
          result.warnings.push('Article IV: EARS format detected in requirements');
        } else {
          result.violations.push(`Article IV: Requirements file exists but no EARS patterns found: ${reqPath}`);
          result.passed = false;
        }
        break;
      }
    }

    if (!requirementsFound) {
      result.warnings.push('Article IV: No requirements.md found - create when starting new features');
    }

    result.summary = requirementsFound 
      ? 'Article IV: Requirements file found'
      : 'Article IV: No requirements file - OK for infrastructure phase';
    
    return result;
  }

  /**
   * Article V: Traceability Mandate
   */
  async validateArticle5() {
    const result = {
      article: 5,
      name: 'Traceability Mandate',
      passed: true,
      violations: [],
      warnings: [],
      summary: ''
    };

    // Check for traceability matrix
    const traceabilityPaths = [
      path.join(this.steeringPath, 'traceability.md'),
      path.join(this.projectRoot, 'docs', 'traceability.md')
    ];

    let traceabilityFound = false;
    for (const tracePath of traceabilityPaths) {
      if (await fs.pathExists(tracePath)) {
        traceabilityFound = true;
        result.warnings.push('Article V: Traceability matrix found');
        break;
      }
    }

    if (!traceabilityFound) {
      result.warnings.push('Article V: No traceability matrix - create when requirements exist');
    }

    result.summary = 'Article V: Traceability - Create matrix when requirements are defined';
    return result;
  }

  /**
   * Article VI: Project Memory (Steering System)
   */
  async validateArticle6() {
    const result = {
      article: 6,
      name: 'Project Memory (Steering System)',
      passed: true,
      violations: [],
      warnings: [],
      summary: ''
    };

    // Check for steering files
    const requiredFiles = [
      'structure.md',
      'tech.md',
      'product.md'
    ];

    const missingFiles = [];
    for (const file of requiredFiles) {
      const filePath = path.join(this.steeringPath, file);
      if (!await fs.pathExists(filePath)) {
        missingFiles.push(file);
      }
    }

    if (missingFiles.length > 0) {
      result.passed = false;
      result.violations.push(`Article VI: Missing steering files: ${missingFiles.join(', ')}`);
    } else {
      result.warnings.push('Article VI: All steering files present');
    }

    // Check for project.yml
    const projectYmlPath = path.join(this.steeringPath, 'project.yml');
    if (await fs.pathExists(projectYmlPath)) {
      result.warnings.push('Article VI: project.yml found');
    }

    result.summary = missingFiles.length === 0
      ? 'Article VI: All steering files present'
      : `Article VI: Missing ${missingFiles.length} steering files`;
    
    return result;
  }

  /**
   * Article VII: Simplicity Gate (≤3 sub-projects)
   */
  async validateArticle7() {
    const result = {
      article: 7,
      name: 'Simplicity Gate',
      passed: true,
      violations: [],
      warnings: [],
      summary: ''
    };

    // Count independently deployable projects (directories with package.json)
    const packageJsonFiles = await glob('**/package.json', {
      cwd: this.projectRoot,
      ignore: ['**/node_modules/**']
    });

    const projectCount = packageJsonFiles.length;

    if (projectCount > 3) {
      result.passed = false;
      result.violations.push(`Article VII: ${projectCount} sub-projects detected (limit: 3) - Phase -1 Gate approval required`);
    } else {
      result.warnings.push(`Article VII: ${projectCount} sub-project(s) detected - within Simplicity Gate limit`);
    }

    result.summary = `Article VII: ${projectCount} sub-project(s) ${projectCount > 3 ? '(EXCEEDS LIMIT)' : '(within limit)'}`;
    return result;
  }

  /**
   * Article VIII: Anti-Abstraction Gate
   */
  async validateArticle8() {
    const result = {
      article: 8,
      name: 'Anti-Abstraction Gate',
      passed: true,
      violations: [],
      warnings: [],
      summary: ''
    };

    // Detect potential abstraction layers (common patterns)
    const abstractionPatterns = [
      '**/lib/*wrapper*.js',
      '**/lib/*abstraction*.js',
      '**/src/*wrapper*.js',
      '**/src/*facade*.js',
      '**/adapters/**/*.js'
    ];

    let abstractionCount = 0;
    for (const pattern of abstractionPatterns) {
      const files = await glob(pattern, { cwd: this.projectRoot });
      abstractionCount += files.length;
    }

    if (abstractionCount > 0) {
      result.warnings.push(`Article VIII: ${abstractionCount} potential abstraction layers detected - verify necessity`);
    }

    result.summary = abstractionCount > 0
      ? `Article VIII: ${abstractionCount} potential abstractions - manual review needed`
      : 'Article VIII: No obvious abstraction layers detected';
    
    return result;
  }

  /**
   * Article IX: Integration-First Testing
   */
  async validateArticle9() {
    const result = {
      article: 9,
      name: 'Integration-First Testing',
      passed: true,
      violations: [],
      warnings: [],
      summary: ''
    };

    // Check for integration test files
    const integrationPatterns = [
      '**/test/integration/**/*.js',
      '**/tests/integration/**/*.js',
      '**/*.integration.test.js',
      '**/*.integration.spec.js'
    ];

    let integrationTestCount = 0;
    for (const pattern of integrationPatterns) {
      const files = await glob(pattern, { cwd: this.projectRoot });
      integrationTestCount += files.length;
    }

    if (integrationTestCount > 0) {
      result.warnings.push(`Article IX: ${integrationTestCount} integration test files found - verify real services usage`);
    } else {
      result.warnings.push('Article IX: No integration tests found - add when integrating external services');
    }

    result.summary = integrationTestCount > 0
      ? `Article IX: ${integrationTestCount} integration tests found`
      : 'Article IX: No integration tests - OK for early development';
    
    return result;
  }

  /**
   * Validate Phase -1 Gates
   */
  async validateGates() {
    const results = {
      passed: true,
      violations: [],
      warnings: [],
      gates: {}
    };

    // Simplicity Gate (Article VII)
    const simplicityGate = await this.validateArticle7();
    results.gates.simplicity = simplicityGate;
    if (!simplicityGate.passed) {
      results.passed = false;
      results.violations.push(...simplicityGate.violations);
    }

    // Anti-Abstraction Gate (Article VIII)
    const abstractionGate = await this.validateArticle8();
    results.gates.abstraction = abstractionGate;
    results.warnings.push(...abstractionGate.warnings);

    results.summary = results.passed
      ? 'All Phase -1 Gates passed'
      : 'Phase -1 Gate violations detected';

    return results;
  }

  /**
   * Validate complexity limits
   */
  async validateComplexity() {
    const results = {
      passed: true,
      violations: [],
      warnings: [],
      files: []
    };

    // Find all source files
    const sourcePatterns = [
      'src/**/*.js',
      'lib/**/*.js',
      'bin/**/*.js'
    ];

    const files = [];
    for (const pattern of sourcePatterns) {
      const matches = await glob(pattern, { cwd: this.projectRoot });
      files.push(...matches.map(f => path.join(this.projectRoot, f)));
    }

    // Check module line counts (≤1500 lines)
    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const lines = content.split('\n').length;

      if (lines > 1500) {
        results.passed = false;
        results.violations.push(`${path.relative(this.projectRoot, file)}: ${lines} lines (limit: 1500)`);
      } else if (lines > 1000) {
        results.warnings.push(`${path.relative(this.projectRoot, file)}: ${lines} lines (approaching limit)`);
      }

      results.files.push({
        file: path.relative(this.projectRoot, file),
        lines,
        exceeds: lines > 1500
      });
    }

    results.summary = results.passed
      ? `${files.length} files analyzed - all within complexity limits`
      : `${results.violations.length} files exceed 1500 line limit`;

    return results;
  }
}

module.exports = ConstitutionValidator;
